/**
 * ============================================================================
 *  Purchase.gs – STAGE 05 (PR, quotation, PO) + STAGE 06 (GRN, return to vendor).
 *  Units: PR qty = BASE_UOM · PO / GRN qty = PURCHASE_UOM · ledger = BASE_UOM.
 * ============================================================================
 */

/* ---------------------------------------------------------------- PR */
/** Form entry. p: {header:{PROJECT_ID?, DEPARTMENT, REQUIRED_DATE, PRIORITY, REASON, PR_SOURCE?}, items:[{STAGE_CODE, PRODUCT_ID, REQUESTED_QTY, REQUIRED_DATE, REMARKS}]} */
function createPr_(p) {
  const h = Object.assign({ PR_SOURCE: 'MANUAL' }, p.header || {});
  const items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && num_(i.REQUESTED_QTY) > 0; });
  if (!items.length) throw new Error('Add at least one product with quantity');
  if (h.PROJECT_ID) mustFind_('PRJ_PROJECT', 'PROJECT_ID', h.PROJECT_ID, 'Project');
  return { PR_ID: createPrInternal_(h, items) };
}

function createPrInternal_(h, items) {
  h = Object.assign({}, h);
  h.PR_DATE = h.PR_DATE || today_();
  h.REQUESTED_BY = h.REQUESTED_BY || currentUser_().USER_ID;
  h.REQUIRED_DATE = h.REQUIRED_DATE || addDays_(today_(), 7);
  h.PRIORITY = h.PRIORITY || 'MEDIUM';
  h.PR_STATUS = 'PENDING APPROVAL';
  requireFields_('PUR_PR', h);
  let est = 0;
  const lines = items.map(function (i, n) {
    const pr = product_(i.PRODUCT_ID), q = num_(i.REQUESTED_QTY);
    est += q * num_(pr.STANDARD_RATE);
    return { PROJECT_ID: h.PROJECT_ID || '', STAGE_CODE: i.STAGE_CODE || '', BOM_ITEM_ID: i.BOM_ITEM_ID || '',
      PRODUCT_ID: pr.PRODUCT_ID, PRODUCT_NAME: pr.PRODUCT_NAME, UOM: pr.BASE_UOM, REQUESTED_QTY: q, ORDERED_QTY: 0,
      REQUIRED_DATE: i.REQUIRED_DATE || h.REQUIRED_DATE, LINE_STATUS: 'OPEN', REMARKS: i.REMARKS || '' };
  });
  const prId = nextIds_('PUR_PR')[0], ids = nextIds_('PUR_PR_ITEMS', lines.length);
  lines.forEach(function (l, n) { l.PR_ITEM_ID = ids[n]; l.PR_ID = prId; });
  h.PR_ID = prId; h.ESTIMATED_VALUE = round_(est);
  insert_('PUR_PR', [h]); insert_('PUR_PR_ITEMS', lines);
  logAudit_('CREATE', 'PUR_PR', prId, '', '', h.PR_STATUS);
  return prId;
}

function approvePr_(id, ok, reason, qtyOverrides) {
  const h = mustFind_('PUR_PR', 'PR_ID', id, 'PR');
  if (h.PR_STATUS !== 'PENDING APPROVAL') throw new Error('PR is ' + h.PR_STATUS);
  assertApprove_('PR', h.ESTIMATED_VALUE, 'PURCHASE_REQUEST');
  const lines = rows_('PUR_PR_ITEMS').filter(function (l) { return l.PR_ID === id; });
  if (!ok) {
    update_('PUR_PR', h, { PR_STATUS: 'REJECTED', REJECTION_REASON: reason || '', APPROVED_BY: currentUser_().USER_ID, APPROVED_DATE: today_() });
    lines.forEach(function (l) { update_('PUR_PR_ITEMS', l, { LINE_STATUS: 'CANCELLED' }, false); });
    return h;
  }
  const ov = qtyOverrides || {};
  lines.forEach(function (l) {
    update_('PUR_PR_ITEMS', l, { APPROVED_QTY: ov[l.PR_ITEM_ID] !== undefined ? num_(ov[l.PR_ITEM_ID]) : num_(l.REQUESTED_QTY) }, false);
  });
  update_('PUR_PR', h, { PR_STATUS: 'APPROVED', APPROVED_BY: currentUser_().USER_ID, APPROVED_DATE: today_() });
  return h;
}

/* ---------------------------------------------------------------- quotations */
/** p: {PR_ITEM_ID, SUPPLIER_ID, QUOTED_QTY, QUOTED_RATE, GST_PCT, FREIGHT, LEAD_TIME_DAYS, VALID_TILL, ATTACHMENT_URL} */
function addQuote_(p) {
  const l = mustFind_('PUR_PR_ITEMS', 'PR_ITEM_ID', p.PR_ITEM_ID, 'PR line');
  mustFind_('MST_SUPPLIER', 'SUPPLIER_ID', p.SUPPLIER_ID, 'Supplier');
  const q = Object.assign({}, p, { QUOTE_ID: nextIds_('PUR_QUOTATION')[0], QUOTE_DATE: p.QUOTE_DATE || today_(), PR_ID: l.PR_ID,
    PRODUCT_ID: l.PRODUCT_ID, IS_SELECTED: 'N', GST_PCT: blank_(p.GST_PCT) ? product_(l.PRODUCT_ID).GST_PCT : p.GST_PCT });
  requireFields_('PUR_QUOTATION', q);
  insert_('PUR_QUOTATION', [q]);
  return { QUOTE_ID: q.QUOTE_ID };
}

function selectQuote_(p) {
  const q = mustFind_('PUR_QUOTATION', 'QUOTE_ID', p.QUOTE_ID, 'Quotation');
  rows_('PUR_QUOTATION').forEach(function (r) {
    if (r.PR_ITEM_ID === q.PR_ITEM_ID) update_('PUR_QUOTATION', r, { IS_SELECTED: r.QUOTE_ID === q.QUOTE_ID ? 'Y' : 'N' });
  });
  return { QUOTE_ID: q.QUOTE_ID };
}

/* ---------------------------------------------------------------- PO */
/** Approved PR lines with qty still to order, priced: selected quote > supplier price list > standard rate. p: {SUPPLIER_ID?, PROJECT_ID?} */
function prLinesForPo_(p) {
  const ok = {};
  rows_('PUR_PR').forEach(function (r) { if (['APPROVED', 'PARTIALLY ORDERED'].indexOf(r.PR_STATUS) >= 0) ok[r.PR_ID] = 1; });
  const quotes = {};
  rows_('PUR_QUOTATION').forEach(function (q) { if (q.IS_SELECTED === 'Y') quotes[q.PR_ITEM_ID] = q; });
  const prices = {};
  cachedRows_('MST_SUPPLIER_PRICE').forEach(function (r) { if (String(r.STATUS).toUpperCase() === 'ACTIVE') prices[key_(r.SUPPLIER_ID, r.PRODUCT_ID)] = r; });
  return rows_('PUR_PR_ITEMS').filter(function (l) {
    return ok[l.PR_ID] && ['OPEN', 'PARTIALLY ORDERED'].indexOf(l.LINE_STATUS) >= 0 && (!p.PROJECT_ID || l.PROJECT_ID === p.PROJECT_ID);
  }).map(function (l) {
    const pr = product_(l.PRODUCT_ID), conv = num_(pr.PURCHASE_TO_BASE) || 1;
    const pendingBase = num_(l.APPROVED_QTY) - num_(l.ORDERED_QTY);
    const q = quotes[l.PR_ITEM_ID];
    const sp = p.SUPPLIER_ID ? prices[key_(p.SUPPLIER_ID, l.PRODUCT_ID)] : null;
    if (q && p.SUPPLIER_ID && q.SUPPLIER_ID !== p.SUPPLIER_ID) return null;
    const rate = q ? num_(q.QUOTED_RATE) : sp ? num_(sp.RATE) : round_(num_(pr.STANDARD_RATE) * conv);
    return { PR_ITEM_ID: l.PR_ITEM_ID, PROJECT_ID: l.PROJECT_ID, STAGE_CODE: l.STAGE_CODE, PRODUCT_ID: l.PRODUCT_ID,
      ORDERED_QTY: round_(pendingBase / conv, 3), UNIT_RATE: rate, DISCOUNT_PCT: 0, GST_PCT: q && !blank_(q.GST_PCT) ? q.GST_PCT : pr.GST_PCT,
      EXPECTED_DATE: fmtVal_(l.REQUIRED_DATE) };
  }).filter(function (x) { return x && x.ORDERED_QTY > 0; });
}

/** p: {header:{SUPPLIER_ID, PROJECT_ID, DELIVERY_LOCATION_ID, PAYMENT_TERMS, EXPECTED_DELIVERY, FREIGHT, REMARKS}, items:[{PR_ITEM_ID?, PROJECT_ID, STAGE_CODE, PRODUCT_ID, ORDERED_QTY, UNIT_RATE, DISCOUNT_PCT, GST_PCT, EXPECTED_DATE}]} */
function createPo_(p) {
  const h = Object.assign({}, p.header || {});
  const items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && num_(i.ORDERED_QTY) > 0; });
  if (!items.length) throw new Error('Add at least one line');
  const sup = mustFind_('MST_SUPPLIER', 'SUPPLIER_ID', h.SUPPLIER_ID, 'Supplier');
  if (String(sup.STATUS).toUpperCase() !== 'ACTIVE') throw new Error('Supplier is ' + sup.STATUS);
  h.PO_DATE = h.PO_DATE || today_();
  h.DELIVERY_LOCATION_ID = h.DELIVERY_LOCATION_ID || cfg_('DEFAULT_WAREHOUSE_ID');
  h.PAYMENT_TERMS = h.PAYMENT_TERMS || sup.PAYMENT_TERMS;
  h.PO_STATUS = 'PENDING APPROVAL';
  requireFields_('PUR_PO', h);
  const prLines = indexBy_(rows_('PUR_PR_ITEMS'), 'PR_ITEM_ID');
  let sub = 0, disc = 0, gst = 0;
  const prUse = {};
  const lines = items.map(function (i, n) {
    const pr = product_(i.PRODUCT_ID), conv = num_(pr.PURCHASE_TO_BASE) || 1;
    const qty = num_(i.ORDERED_QTY), rate = num_(i.UNIT_RATE), dp = num_(i.DISCOUNT_PCT);
    if (rate <= 0) throw new Error('Line ' + (n + 1) + ': UNIT_RATE required');
    if (i.PR_ITEM_ID) {
      const l = prLines[i.PR_ITEM_ID];
      if (!l) throw new Error('PR line ' + i.PR_ITEM_ID + ' not found');
      prUse[i.PR_ITEM_ID] = (prUse[i.PR_ITEM_ID] || 0) + qty * conv;
      const pending = num_(l.APPROVED_QTY) - num_(l.ORDERED_QTY);
      if (prUse[i.PR_ITEM_ID] - pending > 1e-6) throw new Error('Line ' + (n + 1) + ': ordering more than pending on ' + i.PR_ITEM_ID + ' (pending ' + round_(pending / conv, 3) + ' ' + pr.PURCHASE_UOM + ')');
    }
    const gross = qty * rate, d = gross * dp / 100, taxable = gross - d;
    const gp = blank_(i.GST_PCT) ? num_(pr.GST_PCT) : num_(i.GST_PCT), g = taxable * gp / 100;
    sub += gross; disc += d; gst += g;
    const prl = i.PR_ITEM_ID ? prLines[i.PR_ITEM_ID] : null;
    return { PR_ITEM_ID: i.PR_ITEM_ID || '', PROJECT_ID: i.PROJECT_ID || (prl && prl.PROJECT_ID) || h.PROJECT_ID || '',
      STAGE_CODE: i.STAGE_CODE || (prl && prl.STAGE_CODE) || '', PRODUCT_ID: pr.PRODUCT_ID, PRODUCT_NAME: pr.PRODUCT_NAME, PURCHASE_UOM: pr.PURCHASE_UOM,
      ORDERED_QTY: qty, UNIT_RATE: rate, DISCOUNT_PCT: dp, TAXABLE_AMOUNT: round_(taxable), GST_PCT: gp, GST_AMOUNT: round_(g),
      LINE_TOTAL: round_(taxable + g), EXPECTED_DATE: i.EXPECTED_DATE || h.EXPECTED_DELIVERY, RECEIVED_QTY: 0, PENDING_QTY: qty, LINE_STATUS: 'OPEN' };
  });
  const poId = nextIds_('PUR_PO')[0], ids = nextIds_('PUR_PO_ITEMS', lines.length);
  lines.forEach(function (l, n) { l.PO_ITEM_ID = ids[n]; l.PO_ID = poId; });
  Object.assign(h, { PO_ID: poId, SUBTOTAL: round_(sub), DISCOUNT_TOTAL: round_(disc), GST_TOTAL: round_(gst),
    GRAND_TOTAL: round_(sub - disc + gst + num_(h.FREIGHT)) });
  insert_('PUR_PO', [h]); insert_('PUR_PO_ITEMS', lines);
  applyPrOrdered_(prUse, 1);
  logAudit_('CREATE', 'PUR_PO', poId, '', '', h.PO_STATUS);
  return { PO_ID: poId, GRAND_TOTAL: h.GRAND_TOTAL };
}

/** Add (sign=1) or remove (sign=-1) ordered base qty on PR lines and refresh PR statuses. */
function applyPrOrdered_(prUse, sign) {
  const prLines = indexBy_(rows_('PUR_PR_ITEMS'), 'PR_ITEM_ID'), touched = {};
  Object.keys(prUse).forEach(function (id) {
    const l = prLines[id], ord = round_(Math.max(num_(l.ORDERED_QTY) + sign * prUse[id], 0), 3);
    update_('PUR_PR_ITEMS', l, { ORDERED_QTY: ord, LINE_STATUS: ord <= 0 ? 'OPEN' : (ord + 1e-6 >= num_(l.APPROVED_QTY) ? 'ORDERED' : 'PARTIALLY ORDERED') }, false);
    touched[l.PR_ID] = 1;
  });
  Object.keys(touched).forEach(function (prId) {
    const ls = rows_('PUR_PR_ITEMS').filter(function (l) { return l.PR_ID === prId && l.LINE_STATUS !== 'CANCELLED'; });
    const st = ls.every(function (l) { return l.LINE_STATUS === 'ORDERED'; }) ? 'ORDERED' :
      ls.some(function (l) { return l.LINE_STATUS !== 'OPEN'; }) ? 'PARTIALLY ORDERED' : 'APPROVED';
    update_('PUR_PR', mustFind_('PUR_PR', 'PR_ID', prId), { PR_STATUS: st });
  });
}

function approvePo_(id, ok, reason) {
  const h = mustFind_('PUR_PO', 'PO_ID', id, 'PO');
  if (h.PO_STATUS !== 'PENDING APPROVAL') throw new Error('PO is ' + h.PO_STATUS);
  assertApprove_('PO', h.GRAND_TOTAL, 'PURCHASE_ORDER');
  if (!ok) { cancelPoInternal_(h, 'Rejected: ' + (reason || '')); return h; }
  update_('PUR_PO', h, { PO_STATUS: 'APPROVED', APPROVED_BY: currentUser_().USER_ID, APPROVED_DATE: today_() });
  refreshStockAgg_(rows_('PUR_PO_ITEMS').filter(function (l) { return l.PO_ID === id; }).map(function (l) { return key_(l.PRODUCT_ID, h.DELIVERY_LOCATION_ID); }));
  return h;
}

function markPoSent_(p) {
  const h = mustFind_('PUR_PO', 'PO_ID', p.PO_ID, 'PO');
  if (h.PO_STATUS !== 'APPROVED') throw new Error('Only APPROVED POs can be marked as sent');
  update_('PUR_PO', h, { PO_STATUS: 'SENT TO SUPPLIER' });
  return { PO_ID: h.PO_ID };
}

function cancelPo_(p) {
  const h = mustFind_('PUR_PO', 'PO_ID', p.PO_ID, 'PO');
  cancelPoInternal_(h, p.reason || 'Cancelled');
  return { PO_ID: h.PO_ID };
}

function cancelPoInternal_(h, reason) {
  const lines = rows_('PUR_PO_ITEMS').filter(function (l) { return l.PO_ID === h.PO_ID; });
  if (lines.some(function (l) { return num_(l.RECEIVED_QTY) > 0; })) throw new Error('PO has receipts – short-close the remaining lines instead');
  if (['CANCELLED', 'CLOSED', 'RECEIVED'].indexOf(h.PO_STATUS) >= 0) throw new Error('PO is ' + h.PO_STATUS);
  const prUse = {};
  lines.forEach(function (l) {
    if (l.PR_ITEM_ID) prUse[l.PR_ITEM_ID] = (prUse[l.PR_ITEM_ID] || 0) + num_(l.ORDERED_QTY) * (num_(product_(l.PRODUCT_ID).PURCHASE_TO_BASE) || 1);
    update_('PUR_PO_ITEMS', l, { PENDING_QTY: 0, LINE_STATUS: 'CANCELLED' }, false);
  });
  update_('PUR_PO', h, { PO_STATUS: 'CANCELLED', REMARKS: reason });
  applyPrOrdered_(prUse, -1);
  refreshStockAgg_(lines.map(function (l) { return key_(l.PRODUCT_ID, h.DELIVERY_LOCATION_ID); }));
}

/* ---------------------------------------------------------------- GRN */
function poLinesForGrn_(p) {
  const h = mustFind_('PUR_PO', 'PO_ID', p.PO_ID, 'PO');
  if (['APPROVED', 'SENT TO SUPPLIER', 'PARTIALLY RECEIVED'].indexOf(h.PO_STATUS) < 0) throw new Error('PO is ' + h.PO_STATUS + ' – cannot receive');
  return rows_('PUR_PO_ITEMS').filter(function (l) { return l.PO_ID === h.PO_ID && num_(l.PENDING_QTY) > 0; }).map(function (l) {
    return { PO_ITEM_ID: l.PO_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID, PENDING: l.PENDING_QTY, RECEIVED_QTY: l.PENDING_QTY, ACCEPTED_QTY: l.PENDING_QTY };
  });
}

/** p: {header:{PO_ID, GRN_DATE, INVOICE_NO, INVOICE_DATE, INVOICE_AMOUNT, CHALLAN_NO, VEHICLE_NO, RECEIVED_LOCATION_ID, RECEIVED_BY, INSPECTED_BY, ATTACHMENT_URL},
 *      items:[{PO_ITEM_ID, RECEIVED_QTY, ACCEPTED_QTY, REJECTION_REASON, BIN_LOCATION, BATCH_NO, SERIAL_NO, EXPIRY_DATE}]} */
function postGrn_(p) {
  const h = Object.assign({}, p.header || {});
  const po = mustFind_('PUR_PO', 'PO_ID', h.PO_ID, 'PO');
  if (['APPROVED', 'SENT TO SUPPLIER', 'PARTIALLY RECEIVED'].indexOf(po.PO_STATUS) < 0) throw new Error('PO is ' + po.PO_STATUS + ' – cannot receive');
  const poLines = indexBy_(rows_('PUR_PO_ITEMS').filter(function (l) { return l.PO_ID === po.PO_ID; }), 'PO_ITEM_ID');
  const items = (p.items || []).filter(function (i) { return i.PO_ITEM_ID && num_(i.RECEIVED_QTY) > 0; });
  if (!items.length) throw new Error('Enter received quantity on at least one line');
  Object.assign(h, { GRN_DATE: h.GRN_DATE || today_(), SUPPLIER_ID: po.SUPPLIER_ID, PROJECT_ID: po.PROJECT_ID,
    RECEIVED_LOCATION_ID: h.RECEIVED_LOCATION_ID || po.DELIVERY_LOCATION_ID, RECEIVED_BY: h.RECEIVED_BY || currentUser_().USER_ID, GRN_STATUS: 'POSTED' });
  const grnId = nextIds_('GRN_HEADER')[0];
  let anyRej = false, allRej = true;
  const lines = items.map(function (i, n) {
    const l = poLines[i.PO_ITEM_ID];
    if (!l) throw new Error('PO line ' + i.PO_ITEM_ID + ' does not belong to ' + po.PO_ID);
    const rec = num_(i.RECEIVED_QTY), acc = blank_(i.ACCEPTED_QTY) ? rec : num_(i.ACCEPTED_QTY);
    if (acc > rec) throw new Error(l.PRODUCT_NAME + ': accepted > received');
    if (acc - num_(l.PENDING_QTY) > 1e-6) throw new Error(l.PRODUCT_NAME + ': accepting ' + acc + ' but only ' + l.PENDING_QTY + ' pending on PO');
    const rej = round_(rec - acc, 3);
    if (rej > 0 && blank_(i.REJECTION_REASON)) throw new Error(l.PRODUCT_NAME + ': REJECTION_REASON required for rejected qty');
    if (rej > 0) anyRej = true; if (acc > 0) allRej = false;
    const pr = product_(l.PRODUCT_ID), conv = num_(pr.PURCHASE_TO_BASE) || 1;
    const rate = round_(num_(l.UNIT_RATE) * (1 - num_(l.DISCOUNT_PCT) / 100) / conv, 4);
    const baseQ = round_(acc * conv, 3);
    if (String(pr.IS_BATCH_TRACKED).toUpperCase() === 'Y' && acc > 0 && blank_(i.BATCH_NO)) throw new Error(pr.PRODUCT_NAME + ': BATCH_NO required');
    if (String(pr.IS_EXPIRY_TRACKED).toUpperCase() === 'Y' && acc > 0 && blank_(i.EXPIRY_DATE)) throw new Error(pr.PRODUCT_NAME + ': EXPIRY_DATE required');
    return { _po: l, GRN_ID: grnId, PO_ITEM_ID: l.PO_ITEM_ID, PROJECT_ID: l.PROJECT_ID, STAGE_CODE: l.STAGE_CODE, PRODUCT_ID: l.PRODUCT_ID,
      PRODUCT_NAME: l.PRODUCT_NAME, RECEIVED_QTY: rec, ACCEPTED_QTY: acc, REJECTED_QTY: rej, REJECTION_REASON: i.REJECTION_REASON || '',
      CONVERSION_FACTOR: conv, ACCEPTED_BASE_QTY: baseQ, UNIT_RATE: rate, LINE_VALUE: round_(baseQ * rate), LOCATION_ID: h.RECEIVED_LOCATION_ID,
      BIN_LOCATION: i.BIN_LOCATION || '', BATCH_NO: i.BATCH_NO || '', SERIAL_NO: i.SERIAL_NO || '', EXPIRY_DATE: i.EXPIRY_DATE || '' };
  });
  const ids = nextIds_('GRN_ITEMS', lines.length);
  lines.forEach(function (l, n) { l.GRN_ITEM_ID = ids[n]; });
  h.GRN_ID = grnId;
  h.INSPECTION_STATUS = h.INSPECTION_STATUS || (allRej ? 'FAILED' : anyRej ? 'PARTIALLY PASSED' : 'PASSED');
  requireFields_('GRN_HEADER', h);
  const plan = prepareLedger_(lines.filter(function (l) { return l.ACCEPTED_BASE_QTY > 0; }).map(function (l) {
    return { TXN_TYPE: 'GRN', REF_SHEET: 'GRN_ITEMS', REF_ID: grnId, REF_LINE_ID: l.GRN_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID, LOCATION_ID: l.LOCATION_ID,
      PROJECT_ID: l.PROJECT_ID, STAGE_CODE: l.STAGE_CODE, IN_QTY: l.ACCEPTED_BASE_QTY, UNIT_RATE: l.UNIT_RATE, BATCH_NO: l.BATCH_NO, TXN_DATE: parseDate_(h.GRN_DATE) || today_() };
  }));
  insert_('GRN_HEADER', [h]);
  insert_('GRN_ITEMS', lines.map(function (l) { const o = Object.assign({}, l); delete o._po; return o; }));
  // PO lines & status
  lines.forEach(function (l) {
    const pl = l._po, recd = round_(num_(pl.RECEIVED_QTY) + l.ACCEPTED_QTY, 3), pend = round_(Math.max(num_(pl.ORDERED_QTY) - recd, 0), 3);
    update_('PUR_PO_ITEMS', pl, { RECEIVED_QTY: recd, PENDING_QTY: pend, LINE_STATUS: pend <= 0 ? 'RECEIVED' : 'PARTIALLY RECEIVED' }, false);
  });
  const all = rows_('PUR_PO_ITEMS').filter(function (l) { return l.PO_ID === po.PO_ID && l.LINE_STATUS !== 'CANCELLED'; });
  update_('PUR_PO', po, { PO_STATUS: all.every(function (l) { return ['RECEIVED', 'SHORT CLOSED'].indexOf(l.LINE_STATUS) >= 0; }) ? 'RECEIVED' : 'PARTIALLY RECEIVED' });
  // rejected at gate -> RTV draft (no stock effect)
  const rej = lines.filter(function (l) { return l.REJECTED_QTY > 0; });
  if (rej.length) {
    const rids = nextIds_('PUR_RETURN', rej.length);
    insert_('PUR_RETURN', rej.map(function (l, n) {
      return { RTV_ID: rids[n], RTV_DATE: today_(), GRN_ID: grnId, GRN_ITEM_ID: l.GRN_ITEM_ID, SUPPLIER_ID: po.SUPPLIER_ID, PRODUCT_ID: l.PRODUCT_ID,
        LOCATION_ID: l.LOCATION_ID, RETURN_QTY: round_(l.REJECTED_QTY * l.CONVERSION_FACTOR, 3), FROM_STOCK: 'N', UNIT_RATE: l.UNIT_RATE,
        RETURN_VALUE: round_(l.REJECTED_QTY * l.CONVERSION_FACTOR * l.UNIT_RATE), REASON: l.REJECTION_REASON, RTV_STATUS: 'DRAFT' };
    }));
  }
  commitLedger_(plan);
  refreshStockAgg_(lines.map(function (l) { return key_(l.PRODUCT_ID, l.LOCATION_ID); }));
  logAudit_('CREATE', 'GRN_HEADER', grnId, '', '', 'POSTED');
  return { GRN_ID: grnId, rejectedLines: rej.length };
}

/* ---------------------------------------------------------------- return to vendor (from stock) */
/** p: {GRN_ITEM_ID, RETURN_QTY (BASE_UOM), REASON, DEBIT_NOTE_NO} – material already in stock goes back to the supplier. */
function createRtv_(p) {
  const g = mustFind_('GRN_ITEMS', 'GRN_ITEM_ID', p.GRN_ITEM_ID, 'GRN line');
  const gh = mustFind_('GRN_HEADER', 'GRN_ID', g.GRN_ID);
  const q = num_(p.RETURN_QTY);
  if (q <= 0) throw new Error('RETURN_QTY required');
  if (blank_(p.REASON)) throw new Error('REASON required');
  const already = sumBy_(rows_('PUR_RETURN').filter(function (r) { return r.GRN_ITEM_ID === g.GRN_ITEM_ID && r.FROM_STOCK === 'Y'; }), function (r) { return r.RETURN_QTY; });
  if (q + already - num_(g.ACCEPTED_BASE_QTY) > 1e-6) throw new Error('Cannot return more than accepted (' + g.ACCEPTED_BASE_QTY + ')');
  const id = nextIds_('PUR_RETURN')[0];
  const plan = prepareLedger_([{ TXN_TYPE: 'RTV', REF_SHEET: 'PUR_RETURN', REF_ID: id, REF_LINE_ID: id, PRODUCT_ID: g.PRODUCT_ID,
    LOCATION_ID: g.LOCATION_ID, PROJECT_ID: g.PROJECT_ID, STAGE_CODE: g.STAGE_CODE, OUT_QTY: q, UNIT_RATE: g.UNIT_RATE }]);
  insert_('PUR_RETURN', [{ RTV_ID: id, RTV_DATE: today_(), GRN_ID: g.GRN_ID, GRN_ITEM_ID: g.GRN_ITEM_ID, SUPPLIER_ID: gh.SUPPLIER_ID,
    PRODUCT_ID: g.PRODUCT_ID, LOCATION_ID: g.LOCATION_ID, RETURN_QTY: q, FROM_STOCK: 'Y', UNIT_RATE: g.UNIT_RATE,
    RETURN_VALUE: round_(q * num_(g.UNIT_RATE)), REASON: p.REASON, DEBIT_NOTE_NO: p.DEBIT_NOTE_NO || '', RTV_STATUS: 'DISPATCHED' }]);
  commitLedger_(plan);
  return { RTV_ID: id };
}

function updateRtvStatus_(p) {
  const r = mustFind_('PUR_RETURN', 'RTV_ID', p.RTV_ID, 'Return');
  update_('PUR_RETURN', r, { RTV_STATUS: p.RTV_STATUS, DEBIT_NOTE_NO: p.DEBIT_NOTE_NO || r.DEBIT_NOTE_NO });
  return { RTV_ID: r.RTV_ID };
}
