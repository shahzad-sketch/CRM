/**
 * ============================================================================
 *  Inventory.gs – STAGE 07. The stock engine.
 *  Every movement = prepareLedger_() (validate + compute rates, no writes)
 *                 -> caller writes its own documents
 *                 -> commitLedger_() (append INV_LEDGER + upsert INV_STOCK).
 *  INV_LEDGER is append-only; INV_STOCK is the live balance the app reads.
 *  Valuation: weighted average (SYS_CONFIG.VALUATION_METHOD).
 * ============================================================================
 */

function stockIndex_() { return indexBy_(rows_('INV_STOCK'), 'STOCK_KEY'); }

function stockRow_(productId, locationId) { return stockIndex_()[key_(productId, locationId)] || null; }

/**
 * entries: [{TXN_TYPE, REF_SHEET, REF_ID, REF_LINE_ID, PRODUCT_ID, LOCATION_ID, PROJECT_ID, STAGE_CODE,
 *            IN_QTY | OUT_QTY (BASE_UOM), UNIT_RATE (optional: OUT defaults to current avg), BATCH_NO, TXN_DATE}]
 * Returns a plan; each entry gets ._rate (rate actually used). Throws on insufficient stock.
 */
function prepareLedger_(entries) {
  const idx = stockIndex_(), allowNeg = String(cfg_('ALLOW_NEGATIVE_STOCK')).toUpperCase() === 'Y';
  const state = {};
  entries.forEach(function (e) {
    if (!e.PRODUCT_ID || !e.LOCATION_ID) throw new Error('Ledger entry needs PRODUCT_ID and LOCATION_ID');
    const k = key_(e.PRODUCT_ID, e.LOCATION_ID);
    let st = state[k];
    if (!st) {
      const r = idx[k];
      st = state[k] = { row: r || null, onHand: r ? num_(r.ON_HAND_QTY) : 0, avg: r ? num_(r.AVG_RATE) : 0, last: null };
      if (!r) { const p = productMap_()[e.PRODUCT_ID]; st.avg = p ? num_(p.STANDARD_RATE) : 0; st.fresh = true; }
    }
    const inQ = num_(e.IN_QTY), outQ = num_(e.OUT_QTY);
    if (inQ < 0 || outQ < 0) throw new Error('Quantities must be positive');
    let rate;
    if (inQ > 0) {
      rate = blank_(e.UNIT_RATE) ? st.avg : num_(e.UNIT_RATE);
      const base = Math.max(st.onHand, 0);
      st.avg = (base + inQ) > 0 ? (base * (st.fresh ? 0 : st.avg) + inQ * rate) / (base + inQ) : rate;
      st.fresh = false;
      st.onHand += inQ;
    }
    if (outQ > 0) {
      rate = blank_(e.UNIT_RATE) ? st.avg : num_(e.UNIT_RATE);
      if (!allowNeg && st.onHand - outQ < -1e-9) {
        const p = productMap_()[e.PRODUCT_ID];
        throw new Error('Insufficient stock: ' + (p ? p.PRODUCT_NAME : e.PRODUCT_ID) + ' at ' + e.LOCATION_ID +
          ' – on hand ' + round_(st.onHand, 3) + ', required ' + outQ);
      }
      st.onHand -= outQ;
    }
    e._rate = round_(rate, 4);
  });
  return { entries: entries, state: state };
}

/** Write the prepared plan: ledger rows in one batch, then INV_STOCK upserts. */
function commitLedger_(plan) {
  const entries = plan.entries;
  if (!entries.length) return [];
  const ids = nextIds_('INV_LEDGER', entries.length), now = new Date(), email = currentEmail_(), products = productMap_();
  const lrows = entries.map(function (e, i) {
    plan.state[key_(e.PRODUCT_ID, e.LOCATION_ID)].last = ids[i];
    const inQ = num_(e.IN_QTY), outQ = num_(e.OUT_QTY);
    return { TXN_ID: ids[i], TXN_DATE: e.TXN_DATE || today_(), TXN_TYPE: e.TXN_TYPE, REF_SHEET: e.REF_SHEET, REF_ID: e.REF_ID,
      REF_LINE_ID: e.REF_LINE_ID, PRODUCT_ID: e.PRODUCT_ID, LOCATION_ID: e.LOCATION_ID, PROJECT_ID: e.PROJECT_ID || '',
      STAGE_CODE: e.STAGE_CODE || '', IN_QTY: inQ, OUT_QTY: outQ, UNIT_RATE: e._rate, TXN_VALUE: round_((inQ - outQ) * e._rate),
      BATCH_NO: e.BATCH_NO || '', USER_EMAIL: email, CREATED_AT: now };
  });
  insert_('INV_LEDGER', lrows);
  const inserts = [];
  Object.keys(plan.state).forEach(function (k) {
    const st = plan.state[k], parts = k.split('|'), p = products[parts[0]] || {};
    const patch = { ON_HAND_QTY: round_(st.onHand, 3), AVG_RATE: round_(st.avg, 4), STOCK_VALUE: round_(st.onHand * st.avg),
      LAST_TXN_ID: st.last, LAST_UPDATED: now };
    if (st.row) {
      patch.AVAILABLE_QTY = round_(st.onHand - num_(st.row.ALLOCATED_QTY), 3);
      patch.REORDER_STATUS = reorderStatus_(st.onHand, p);
      update_('INV_STOCK', st.row, patch, false);
    } else {
      inserts.push(Object.assign({ STOCK_KEY: k, PRODUCT_ID: parts[0], PRODUCT_NAME: p.PRODUCT_NAME, CATEGORY_ID: p.CATEGORY_ID,
        LOCATION_ID: parts[1], UOM: p.BASE_UOM, ALLOCATED_QTY: 0, ON_ORDER_QTY: 0, AVAILABLE_QTY: round_(st.onHand, 3),
        REORDER_LEVEL: p.REORDER_LEVEL, REORDER_STATUS: reorderStatus_(st.onHand, p) }, patch));
    }
  });
  insert_('INV_STOCK', inserts);
  return lrows;
}

function reorderStatus_(onHand, p) {
  p = p || {};
  if (onHand <= 0) return 'OUT';
  if (!blank_(p.MAX_STOCK) && num_(p.MAX_STOCK) > 0 && onHand > num_(p.MAX_STOCK)) return 'OVERSTOCK';
  if (!blank_(p.REORDER_LEVEL) && onHand <= num_(p.REORDER_LEVEL)) return 'LOW';
  return 'OK';
}

/**
 * Recalculate ALLOCATED / AVAILABLE / ON_ORDER for the given product|location keys
 * (after allocation, PO approval/cancel, GRN). Creates the INV_STOCK row if missing.
 */
function refreshStockAgg_(keys) {
  keys = Array.from(new Set(keys.filter(Boolean)));
  if (!keys.length) return;
  const want = {}; keys.forEach(function (k) { want[k] = { alloc: 0, onOrder: 0 }; });
  rows_('PRJ_ALLOCATION').forEach(function (a) {
    const k = key_(a.PRODUCT_ID, a.LOCATION_ID);
    if (want[k] && ['ACTIVE', 'PARTIALLY CONSUMED'].indexOf(a.ALLOCATION_STATUS) >= 0) want[k].alloc += num_(a.OPEN_QTY);
  });
  const openPo = {};
  rows_('PUR_PO').forEach(function (p) {
    if (['APPROVED', 'SENT TO SUPPLIER', 'PARTIALLY RECEIVED'].indexOf(p.PO_STATUS) >= 0) openPo[p.PO_ID] = p.DELIVERY_LOCATION_ID;
  });
  rows_('PUR_PO_ITEMS').forEach(function (l) {
    const loc = openPo[l.PO_ID];
    if (!loc) return;
    const k = key_(l.PRODUCT_ID, loc);
    if (want[k]) want[k].onOrder += num_(l.PENDING_QTY) * num_((productMap_()[l.PRODUCT_ID] || {}).PURCHASE_TO_BASE || 1);
  });
  const idx = stockIndex_(), inserts = [], products = productMap_();
  keys.forEach(function (k) {
    const r = idx[k], w = want[k], parts = k.split('|'), p = products[parts[0]] || {};
    if (r) {
      update_('INV_STOCK', r, { ALLOCATED_QTY: round_(w.alloc, 3), ON_ORDER_QTY: round_(w.onOrder, 3),
        AVAILABLE_QTY: round_(num_(r.ON_HAND_QTY) - w.alloc, 3) }, false);
    } else {
      inserts.push({ STOCK_KEY: k, PRODUCT_ID: parts[0], PRODUCT_NAME: p.PRODUCT_NAME, CATEGORY_ID: p.CATEGORY_ID, LOCATION_ID: parts[1],
        UOM: p.BASE_UOM, ON_HAND_QTY: 0, ALLOCATED_QTY: round_(w.alloc, 3), AVAILABLE_QTY: round_(-w.alloc, 3),
        ON_ORDER_QTY: round_(w.onOrder, 3), AVG_RATE: num_(p.STANDARD_RATE), STOCK_VALUE: 0, REORDER_LEVEL: p.REORDER_LEVEL,
        REORDER_STATUS: 'OUT', LAST_UPDATED: new Date() });
    }
  });
  insert_('INV_STOCK', inserts);
}

/* ---------------------------------------------------------------- opening stock */
/** p: {LOCATION_ID, TXN_DATE?, items:[{PRODUCT_ID, QTY, UNIT_RATE}]} – initial stock load. */
function postOpening_(p) {
  if (!p.LOCATION_ID) throw new Error('LOCATION_ID required');
  mustFind_('MST_LOCATION', 'LOCATION_ID', p.LOCATION_ID, 'Location');
  const items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && num_(i.QTY) > 0; });
  if (!items.length) throw new Error('Add at least one product with quantity');
  const plan = prepareLedger_(items.map(function (i, n) {
    const pr = product_(i.PRODUCT_ID);
    return { TXN_TYPE: 'OPENING', REF_SHEET: 'OPENING', REF_ID: 'OPENING', REF_LINE_ID: String(n + 1), PRODUCT_ID: i.PRODUCT_ID,
      LOCATION_ID: p.LOCATION_ID, IN_QTY: num_(i.QTY), UNIT_RATE: blank_(i.UNIT_RATE) ? num_(pr.STANDARD_RATE) : num_(i.UNIT_RATE),
      TXN_DATE: p.TXN_DATE ? parseDate_(p.TXN_DATE) : today_() };
  }));
  const rows = commitLedger_(plan);
  logAudit_('CREATE', 'INV_LEDGER', 'OPENING', 'LINES', '', rows.length);
  return { posted: rows.length };
}

/* ---------------------------------------------------------------- transfers */
/** p: {header:{FROM_LOCATION_ID, TO_LOCATION_ID, PROJECT_ID, VEHICLE_NO, TRANSFER_DATE}, items:[{PRODUCT_ID, DISPATCHED_QTY, BATCH_NO, REMARKS}]} */
function dispatchTransfer_(p) {
  const h = Object.assign({}, p.header), items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && num_(i.DISPATCHED_QTY) > 0; });
  if (!items.length) throw new Error('Add at least one line');
  if (h.FROM_LOCATION_ID === h.TO_LOCATION_ID) throw new Error('FROM and TO location must differ');
  h.TRANSFER_DATE = h.TRANSFER_DATE || today_();
  h.TRANSFER_STATUS = 'IN TRANSIT';
  h.REQUESTED_BY = h.REQUESTED_BY || currentUser_().USER_ID;
  h.APPROVED_BY = currentUser_().USER_ID; h.DISPATCHED_BY = currentUser_().USER_ID;
  requireFields_('INV_TRANSFER', h);
  h.TRANSFER_ID = nextIds_('INV_TRANSFER')[0];
  const ids = nextIds_('INV_TRANSFER_ITEMS', items.length);
  const lines = items.map(function (i, n) {
    const pr = product_(i.PRODUCT_ID);
    return { TRANSFER_ITEM_ID: ids[n], TRANSFER_ID: h.TRANSFER_ID, PRODUCT_ID: i.PRODUCT_ID, PRODUCT_NAME: pr.PRODUCT_NAME, UOM: pr.BASE_UOM,
      DISPATCHED_QTY: num_(i.DISPATCHED_QTY), BATCH_NO: i.BATCH_NO, REMARKS: i.REMARKS };
  });
  const plan = prepareLedger_(lines.map(function (l) {
    return { TXN_TYPE: 'TRANSFER_OUT', REF_SHEET: 'INV_TRANSFER_ITEMS', REF_ID: h.TRANSFER_ID, REF_LINE_ID: l.TRANSFER_ITEM_ID,
      PRODUCT_ID: l.PRODUCT_ID, LOCATION_ID: h.FROM_LOCATION_ID, PROJECT_ID: h.PROJECT_ID, OUT_QTY: l.DISPATCHED_QTY, BATCH_NO: l.BATCH_NO };
  }));
  plan.entries.forEach(function (e, n) { lines[n].UNIT_RATE = e._rate; });
  insert_('INV_TRANSFER', [h]); insert_('INV_TRANSFER_ITEMS', lines);
  commitLedger_(plan);
  logAudit_('CREATE', 'INV_TRANSFER', h.TRANSFER_ID, '', '', 'IN TRANSIT');
  return { TRANSFER_ID: h.TRANSFER_ID };
}

function transferLinesForReceive_(p) {
  return rows_('INV_TRANSFER_ITEMS').filter(function (l) { return l.TRANSFER_ID === p.TRANSFER_ID && blank_(l.RECEIVED_QTY); })
    .map(function (l) { return { TRANSFER_ITEM_ID: l.TRANSFER_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID, DISPATCHED_QTY: l.DISPATCHED_QTY, RECEIVED_QTY: l.DISPATCHED_QTY }; });
}

/** p: {TRANSFER_ID, items:[{TRANSFER_ITEM_ID, RECEIVED_QTY}]} */
function receiveTransfer_(p) {
  const h = mustFind_('INV_TRANSFER', 'TRANSFER_ID', p.TRANSFER_ID, 'Transfer');
  if (h.TRANSFER_STATUS !== 'IN TRANSIT') throw new Error('Transfer is ' + h.TRANSFER_STATUS);
  const lines = rows_('INV_TRANSFER_ITEMS').filter(function (l) { return l.TRANSFER_ID === h.TRANSFER_ID; });
  const byId = {}; (p.items || []).forEach(function (i) { byId[i.TRANSFER_ITEM_ID] = num_(i.RECEIVED_QTY); });
  const entries = [];
  lines.forEach(function (l) {
    const q = byId[l.TRANSFER_ITEM_ID] !== undefined ? byId[l.TRANSFER_ITEM_ID] : num_(l.DISPATCHED_QTY);
    if (q > num_(l.DISPATCHED_QTY)) throw new Error('Received more than dispatched on ' + l.TRANSFER_ITEM_ID);
    l._q = q;
    if (q > 0) entries.push({ TXN_TYPE: 'TRANSFER_IN', REF_SHEET: 'INV_TRANSFER_ITEMS', REF_ID: h.TRANSFER_ID, REF_LINE_ID: l.TRANSFER_ITEM_ID,
      PRODUCT_ID: l.PRODUCT_ID, LOCATION_ID: h.TO_LOCATION_ID, PROJECT_ID: h.PROJECT_ID, IN_QTY: q, UNIT_RATE: l.UNIT_RATE, BATCH_NO: l.BATCH_NO });
  });
  const plan = prepareLedger_(entries);
  let short = false;
  lines.forEach(function (l) {
    const s = round_(num_(l.DISPATCHED_QTY) - l._q, 3); if (s > 0) short = true;
    update_('INV_TRANSFER_ITEMS', l, { RECEIVED_QTY: l._q, SHORT_QTY: s }, false);
  });
  update_('INV_TRANSFER', h, { TRANSFER_STATUS: short ? 'PARTIALLY RECEIVED' : 'RECEIVED', RECEIVED_BY: currentUser_().USER_ID, RECEIVED_DATE: today_() });
  commitLedger_(plan);
  return { TRANSFER_ID: h.TRANSFER_ID, status: h.TRANSFER_STATUS };
}

/* ---------------------------------------------------------------- adjustments */
/** p: {LOCATION_ID, ADJ_DATE?, items:[{PRODUCT_ID, PHYSICAL_QTY, REASON}]} -> PENDING rows */
function createAdjustment_(p) {
  if (!p.LOCATION_ID) throw new Error('LOCATION_ID required');
  const items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && !blank_(i.PHYSICAL_QTY); });
  if (!items.length) throw new Error('Add at least one counted product');
  const ids = nextIds_('INV_ADJUSTMENT', items.length);
  const rows = items.map(function (i, n) {
    const r = stockRow_(i.PRODUCT_ID, p.LOCATION_ID), sys = r ? num_(r.ON_HAND_QTY) : 0;
    const rate = r ? num_(r.AVG_RATE) : num_(product_(i.PRODUCT_ID).STANDARD_RATE), diff = round_(num_(i.PHYSICAL_QTY) - sys, 3);
    return { ADJ_ID: ids[n], ADJ_DATE: p.ADJ_DATE || today_(), PRODUCT_ID: i.PRODUCT_ID, LOCATION_ID: p.LOCATION_ID, SYSTEM_QTY: sys,
      PHYSICAL_QTY: num_(i.PHYSICAL_QTY), DIFFERENCE_QTY: diff, UNIT_RATE: rate, VALUE_IMPACT: round_(diff * rate),
      REASON: i.REASON || 'PHYSICAL COUNT', ADJ_STATUS: 'PENDING' };
  });
  insert_('INV_ADJUSTMENT', rows);
  return { created: ids };
}

function approveAdjustment_(id, ok, reason) {
  const a = mustFind_('INV_ADJUSTMENT', 'ADJ_ID', id, 'Adjustment');
  if (a.ADJ_STATUS !== 'PENDING') throw new Error('Adjustment is ' + a.ADJ_STATUS);
  assertApprove_('ADJUSTMENT', Math.abs(num_(a.VALUE_IMPACT)), 'INVENTORY');
  if (!ok) { update_('INV_ADJUSTMENT', a, { ADJ_STATUS: 'REJECTED', APPROVED_BY: currentUser_().USER_ID, APPROVED_DATE: today_() }); return a; }
  const d = num_(a.DIFFERENCE_QTY);
  const plan = prepareLedger_(d === 0 ? [] : [{ TXN_TYPE: d > 0 ? 'ADJ_IN' : 'ADJ_OUT', REF_SHEET: 'INV_ADJUSTMENT', REF_ID: a.ADJ_ID,
    REF_LINE_ID: a.ADJ_ID, PRODUCT_ID: a.PRODUCT_ID, LOCATION_ID: a.LOCATION_ID, IN_QTY: d > 0 ? d : 0, OUT_QTY: d < 0 ? -d : 0,
    UNIT_RATE: d > 0 ? a.UNIT_RATE : '' }]);
  update_('INV_ADJUSTMENT', a, { ADJ_STATUS: 'APPROVED', APPROVED_BY: currentUser_().USER_ID, APPROVED_DATE: today_() });
  commitLedger_(plan);
  return a;
}
