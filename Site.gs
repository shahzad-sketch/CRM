/**
 * ============================================================================
 *  Site.gs – STAGE 08 (site execution). Every line carries PROJECT_ID + STAGE_CODE.
 *  MR (request, checked vs BOM) -> ISSUE (stock OUT, consumes allocation) -> RETURN (usable IN, damaged -> wastage)
 *  -> WASTAGE (site: cost only · store: stock OUT on approval) -> USAGE LOG (actual installed qty).
 * ============================================================================
 */

/** Net issued (issued − usable returned) per stage|product for a project. */
function issuedNetByKey_(projectId) {
  const out = {};
  rows_('SITE_ISSUE_ITEMS').forEach(function (l) {
    if (l.PROJECT_ID !== projectId) return;
    const k = key_(l.STAGE_CODE, l.PRODUCT_ID);
    out[k] = (out[k] || 0) + num_(l.BASE_QTY) - num_(l.RETURNED_QTY);
  });
  return out;
}

/** BOM balance for project/stage/product = BOM gross − net issued. Returns {gross, issued, balance, bomItemId}. */
function bomBalance_(projectId, stageCode, productId, caches) {
  caches = caches || {};
  const bom = caches.bom || (caches.bom = bomByKey_(projectId));
  const iss = caches.iss || (caches.iss = issuedNetByKey_(projectId));
  const k = key_(stageCode, productId), b = bom[k];
  const gross = b ? b.gross : 0, issued = iss[k] || 0;
  return { gross: gross, issued: issued, balance: round_(gross - issued, 3), bomItemId: b ? b.bomItemId : '' };
}

/* ---------------------------------------------------------------- material request */
/** p: {header:{PROJECT_ID, STAGE_CODE, REQUIRED_DATE, PRIORITY, REMARKS}, items:[{PRODUCT_ID, REQUESTED_QTY, EXTRA_REASON}]} – qty in BASE_UOM */
function createMr_(p) {
  const h = Object.assign({}, p.header || {});
  const items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && num_(i.REQUESTED_QTY) > 0; });
  if (!items.length) throw new Error('Add at least one product');
  mustFind_('PRJ_PROJECT', 'PROJECT_ID', h.PROJECT_ID, 'Project');
  Object.assign(h, { MR_DATE: h.MR_DATE || today_(), REQUESTED_BY: h.REQUESTED_BY || currentUser_().USER_ID,
    REQUIRED_DATE: h.REQUIRED_DATE || today_(), MR_STATUS: 'SUBMITTED' });
  requireFields_('SITE_MR', h);
  const caches = {}, mrId = nextIds_('SITE_MR')[0], ids = nextIds_('SITE_MR_ITEMS', items.length);
  let extra = false;
  const lines = items.map(function (i, n) {
    const pr = product_(i.PRODUCT_ID), bal = bomBalance_(h.PROJECT_ID, h.STAGE_CODE, pr.PRODUCT_ID, caches);
    const q = num_(i.REQUESTED_QTY), isExtra = q - Math.max(bal.balance, 0) > 1e-6;
    if (isExtra && blank_(i.EXTRA_REASON)) throw new Error(pr.PRODUCT_NAME + ': requested ' + q + ' but BOM balance is ' + bal.balance + '. Enter EXTRA_REASON.');
    if (isExtra) extra = true;
    return { MR_ITEM_ID: ids[n], MR_ID: mrId, BOM_ITEM_ID: bal.bomItemId, PRODUCT_ID: pr.PRODUCT_ID, PRODUCT_NAME: pr.PRODUCT_NAME, UOM: pr.BASE_UOM,
      BOM_BALANCE_QTY: bal.balance, REQUESTED_QTY: q, ISSUED_QTY: 0, IS_EXTRA_TO_BOM: isExtra ? 'Y' : 'N', EXTRA_REASON: i.EXTRA_REASON || '', LINE_STATUS: 'OPEN' };
  });
  h.MR_ID = mrId; h.HAS_EXTRA_TO_BOM = extra ? 'Y' : 'N';
  insert_('SITE_MR', [h]); insert_('SITE_MR_ITEMS', lines);
  logAudit_('CREATE', 'SITE_MR', mrId, '', '', 'SUBMITTED');
  return { MR_ID: mrId, extraToBom: extra };
}

function approveMr_(id, ok, reason) {
  const h = mustFind_('SITE_MR', 'MR_ID', id, 'Material request');
  if (h.MR_STATUS !== 'SUBMITTED') throw new Error('MR is ' + h.MR_STATUS);
  assertApprove_('SITE_MR', 0, 'SITE_REQUEST');
  const lines = rows_('SITE_MR_ITEMS').filter(function (l) { return l.MR_ID === id; });
  if (!ok) {
    update_('SITE_MR', h, { MR_STATUS: 'REJECTED', REMARKS: reason || h.REMARKS, APPROVED_BY: currentUser_().USER_ID, APPROVED_DATE: today_() });
    lines.forEach(function (l) { update_('SITE_MR_ITEMS', l, { LINE_STATUS: 'CANCELLED' }, false); });
    return h;
  }
  lines.forEach(function (l) { if (blank_(l.APPROVED_QTY)) update_('SITE_MR_ITEMS', l, { APPROVED_QTY: l.REQUESTED_QTY }, false); });
  update_('SITE_MR', h, { MR_STATUS: 'APPROVED', APPROVED_BY: currentUser_().USER_ID, APPROVED_DATE: today_() });
  return h;
}

function mrLinesForIssue_(p) {
  const h = mustFind_('SITE_MR', 'MR_ID', p.MR_ID, 'Material request');
  if (['APPROVED', 'PARTIALLY ISSUED'].indexOf(h.MR_STATUS) < 0) throw new Error('MR is ' + h.MR_STATUS + ' – approve it first');
  return {
    header: { PROJECT_ID: h.PROJECT_ID, STAGE_CODE: h.STAGE_CODE },
    items: rows_('SITE_MR_ITEMS').filter(function (l) { return l.MR_ID === h.MR_ID && num_(l.APPROVED_QTY) - num_(l.ISSUED_QTY) > 0; })
      .map(function (l) {
        const pr = product_(l.PRODUCT_ID), conv = num_(pr.ISSUE_TO_BASE) || 1;
        return { MR_ITEM_ID: l.MR_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID, ISSUED_QTY: round_((num_(l.APPROVED_QTY) - num_(l.ISSUED_QTY)) / conv, 3) };
      })
  };
}

/* ---------------------------------------------------------------- issue */
/** p: {header:{PROJECT_ID, STAGE_CODE, MR_ID?, FROM_LOCATION_ID, ISSUED_TO, PURPOSE, ISSUE_DATE}, items:[{PRODUCT_ID, ISSUED_QTY (ISSUE_UOM), MR_ITEM_ID?, BATCH_NO, SERIAL_NO}]} */
function issueMaterial_(p) {
  const h = Object.assign({}, p.header || {});
  const items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && num_(i.ISSUED_QTY) > 0; });
  if (!items.length) throw new Error('Add at least one product with quantity');
  let mr = null;
  if (h.MR_ID) {
    mr = mustFind_('SITE_MR', 'MR_ID', h.MR_ID, 'Material request');
    if (['APPROVED', 'PARTIALLY ISSUED'].indexOf(mr.MR_STATUS) < 0) throw new Error('MR is ' + mr.MR_STATUS);
    h.PROJECT_ID = mr.PROJECT_ID; h.STAGE_CODE = mr.STAGE_CODE;
  }
  mustFind_('PRJ_PROJECT', 'PROJECT_ID', h.PROJECT_ID, 'Project');
  Object.assign(h, { ISSUE_DATE: h.ISSUE_DATE || today_(), FROM_LOCATION_ID: h.FROM_LOCATION_ID || cfg_('DEFAULT_WAREHOUSE_ID'),
    ISSUED_BY: currentUser_().USER_ID, ISSUE_STATUS: 'ISSUED' });
  requireFields_('SITE_ISSUE', h);
  const tol = num_(cfg_('EXTRA_ISSUE_TOLERANCE_PCT')), caches = {};
  const mrLines = mr ? indexBy_(rows_('SITE_MR_ITEMS').filter(function (l) { return l.MR_ID === mr.MR_ID; }), 'MR_ITEM_ID') : {};
  const needByKey = {};
  const lines = items.map(function (i, n) {
    const pr = product_(i.PRODUCT_ID), conv = num_(pr.ISSUE_TO_BASE) || 1, base = round_(num_(i.ISSUED_QTY) * conv, 3);
    const bal = bomBalance_(h.PROJECT_ID, h.STAGE_CODE, pr.PRODUCT_ID, caches);
    if (i.MR_ITEM_ID) {
      const ml = mrLines[i.MR_ITEM_ID];
      if (!ml) throw new Error('MR line ' + i.MR_ITEM_ID + ' not in ' + h.MR_ID);
      if (base - (num_(ml.APPROVED_QTY) - num_(ml.ISSUED_QTY)) > 1e-6) throw new Error(pr.PRODUCT_NAME + ': issuing more than approved on MR');
    } else if (bal.issued + base - bal.gross * (1 + tol / 100) > 1e-6) {
      throw new Error(pr.PRODUCT_NAME + ': issue exceeds BOM (' + bal.gross + ') + ' + tol + '% tolerance. Raise a Material Request for the extra qty.');
    }
    // free stock check (allocated to others is not available)
    const k = key_(pr.PRODUCT_ID, h.FROM_LOCATION_ID);
    needByKey[k] = (needByKey[k] || 0) + base;
    const s = stockRow_(pr.PRODUCT_ID, h.FROM_LOCATION_ID);
    const mine = openAllocationFor_(h.PROJECT_ID, h.STAGE_CODE, pr.PRODUCT_ID, h.FROM_LOCATION_ID);
    const free = s ? num_(s.ON_HAND_QTY) - num_(s.ALLOCATED_QTY) + mine : 0;
    if (String(cfg_('ALLOW_NEGATIVE_STOCK')).toUpperCase() !== 'Y' && needByKey[k] - free > 1e-6)
      throw new Error(pr.PRODUCT_NAME + ': only ' + round_(free, 3) + ' ' + pr.BASE_UOM + ' free at ' + h.FROM_LOCATION_ID + ' (rest is reserved for other projects)');
    return { MR_ITEM_ID: i.MR_ITEM_ID || '', BOM_ITEM_ID: bal.bomItemId, PROJECT_ID: h.PROJECT_ID, STAGE_CODE: h.STAGE_CODE,
      PRODUCT_ID: pr.PRODUCT_ID, PRODUCT_NAME: pr.PRODUCT_NAME, ISSUE_UOM: pr.ISSUE_UOM, ISSUED_QTY: num_(i.ISSUED_QTY), BASE_QTY: base,
      RETURNED_QTY: 0, BATCH_NO: i.BATCH_NO || '', SERIAL_NO: i.SERIAL_NO || '' };
  });
  // stock check before any ID is reserved
  prepareLedger_(lines.map(function (l) { return { PRODUCT_ID: l.PRODUCT_ID, LOCATION_ID: h.FROM_LOCATION_ID, OUT_QTY: l.BASE_QTY }; }));
  const issueId = nextIds_('SITE_ISSUE')[0], ids = nextIds_('SITE_ISSUE_ITEMS', lines.length);
  lines.forEach(function (l, n) { l.ISSUE_ITEM_ID = ids[n]; l.ISSUE_ID = issueId; });
  const plan = prepareLedger_(lines.map(function (l) {
    return { TXN_TYPE: 'ISSUE', REF_SHEET: 'SITE_ISSUE_ITEMS', REF_ID: issueId, REF_LINE_ID: l.ISSUE_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID,
      LOCATION_ID: h.FROM_LOCATION_ID, PROJECT_ID: h.PROJECT_ID, STAGE_CODE: h.STAGE_CODE, OUT_QTY: l.BASE_QTY, BATCH_NO: l.BATCH_NO,
      TXN_DATE: parseDate_(h.ISSUE_DATE) || today_() };
  }));
  let value = 0;
  lines.forEach(function (l, n) {
    l.UNIT_RATE = plan.entries[n]._rate; l.LINE_COST = round_(l.BASE_QTY * l.UNIT_RATE); value += l.LINE_COST;
    l.ALLOCATION_ID = consumeAllocations_(h.PROJECT_ID, h.STAGE_CODE, l.PRODUCT_ID, h.FROM_LOCATION_ID, l.BASE_QTY).allocationId;
  });
  h.ISSUE_ID = issueId; h.ISSUE_VALUE = round_(value);
  insert_('SITE_ISSUE', [h]); insert_('SITE_ISSUE_ITEMS', lines);
  if (mr) {
    lines.forEach(function (l) {
      const ml = mrLines[l.MR_ITEM_ID]; if (!ml) return;
      const iss = round_(num_(ml.ISSUED_QTY) + l.BASE_QTY, 3);
      update_('SITE_MR_ITEMS', ml, { ISSUED_QTY: iss, LINE_STATUS: iss + 1e-6 >= num_(ml.APPROVED_QTY) ? 'ISSUED' : 'PARTIALLY ISSUED' }, false);
    });
    const all = rows_('SITE_MR_ITEMS').filter(function (l) { return l.MR_ID === mr.MR_ID && l.LINE_STATUS !== 'CANCELLED'; });
    update_('SITE_MR', mr, { MR_STATUS: all.every(function (l) { return l.LINE_STATUS === 'ISSUED'; }) ? 'ISSUED' : 'PARTIALLY ISSUED' });
  }
  commitLedger_(plan);
  refreshStockAgg_(lines.map(function (l) { return key_(l.PRODUCT_ID, h.FROM_LOCATION_ID); }));
  touchStage_(h.PROJECT_ID, h.STAGE_CODE);
  logAudit_('CREATE', 'SITE_ISSUE', issueId, '', '', 'ISSUED');
  return { ISSUE_ID: issueId, ISSUE_VALUE: h.ISSUE_VALUE };
}

function acknowledgeIssue_(p) {
  const h = mustFind_('SITE_ISSUE', 'ISSUE_ID', p.ISSUE_ID, 'Issue');
  update_('SITE_ISSUE', h, { ACK_BY: p.ACK_BY || currentUser_().FULL_NAME, ACK_DATE: today_(), ISSUE_STATUS: 'ACKNOWLEDGED' });
  return { ISSUE_ID: h.ISSUE_ID };
}

/* ---------------------------------------------------------------- returns */
/** Issued lines that can still be returned. p: {PROJECT_ID, STAGE_CODE?} */
function issuedLines_(p) {
  const back = {};
  rows_('SITE_RETURN_ITEMS').forEach(function (r) { back[r.ISSUE_ITEM_ID] = (back[r.ISSUE_ITEM_ID] || 0) + num_(r.RETURNED_QTY); });
  return rows_('SITE_ISSUE_ITEMS').filter(function (l) {
    return l.PROJECT_ID === p.PROJECT_ID && (!p.STAGE_CODE || l.STAGE_CODE === p.STAGE_CODE) && num_(l.BASE_QTY) - (back[l.ISSUE_ITEM_ID] || 0) > 0;
  }).map(function (l) {
    return { ISSUE_ITEM_ID: l.ISSUE_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID, RETURNABLE: round_(num_(l.BASE_QTY) - (back[l.ISSUE_ITEM_ID] || 0), 3),
      RETURNED_QTY: '', CONDITION: 'NEW / UNUSED', USABLE_QTY: '', DAMAGED_QTY: '' };
  });
}

/** p: {header:{PROJECT_ID, STAGE_CODE, RETURNED_BY, TO_LOCATION_ID, REASON, RETURN_DATE}, items:[{ISSUE_ITEM_ID, RETURNED_QTY, CONDITION, USABLE_QTY, DAMAGED_QTY}]} – BASE_UOM */
function createReturn_(p) {
  const h = Object.assign({}, p.header || {});
  const items = (p.items || []).filter(function (i) { return i.ISSUE_ITEM_ID && num_(i.RETURNED_QTY) > 0; });
  if (!items.length) throw new Error('Enter returned quantity on at least one line');
  Object.assign(h, { RETURN_DATE: h.RETURN_DATE || today_(), RECEIVED_BY: currentUser_().USER_ID,
    TO_LOCATION_ID: h.TO_LOCATION_ID || cfg_('DEFAULT_WAREHOUSE_ID'), RETURN_STATUS: 'RECEIVED' });
  const issueLines = indexBy_(rows_('SITE_ISSUE_ITEMS'), 'ISSUE_ITEM_ID');
  const back = {};
  rows_('SITE_RETURN_ITEMS').forEach(function (r) { back[r.ISSUE_ITEM_ID] = (back[r.ISSUE_ITEM_ID] || 0) + num_(r.RETURNED_QTY); });
  const retId = nextIds_('SITE_RETURN')[0];
  const lines = items.map(function (i) {
    const il = issueLines[i.ISSUE_ITEM_ID];
    if (!il) throw new Error('Issue line ' + i.ISSUE_ITEM_ID + ' not found');
    if (!h.PROJECT_ID) h.PROJECT_ID = il.PROJECT_ID;
    if (!h.STAGE_CODE) h.STAGE_CODE = il.STAGE_CODE;
    if (il.PROJECT_ID !== h.PROJECT_ID) throw new Error(i.ISSUE_ITEM_ID + ' belongs to another project');
    const q = num_(i.RETURNED_QTY);
    if (q + (back[il.ISSUE_ITEM_ID] || 0) - num_(il.BASE_QTY) > 1e-6) throw new Error(il.PRODUCT_NAME + ': returning more than issued');
    back[il.ISSUE_ITEM_ID] = (back[il.ISSUE_ITEM_ID] || 0) + q;
    let dmg = num_(i.DAMAGED_QTY), use = blank_(i.USABLE_QTY) ? q - dmg : num_(i.USABLE_QTY);
    if (blank_(i.USABLE_QTY) && blank_(i.DAMAGED_QTY) && ['DAMAGED'].indexOf(i.CONDITION) >= 0) { dmg = q; use = 0; }
    if (Math.abs(use + dmg - q) > 1e-6) throw new Error(il.PRODUCT_NAME + ': USABLE + DAMAGED must equal RETURNED');
    return { _il: il, RETURN_ID: retId, ISSUE_ITEM_ID: il.ISSUE_ITEM_ID, PROJECT_ID: il.PROJECT_ID, STAGE_CODE: il.STAGE_CODE, PRODUCT_ID: il.PRODUCT_ID,
      PRODUCT_NAME: il.PRODUCT_NAME, UOM: product_(il.PRODUCT_ID).BASE_UOM, RETURNED_QTY: q, CONDITION: i.CONDITION || 'USABLE',
      USABLE_QTY: round_(use, 3), DAMAGED_QTY: round_(dmg, 3), UNIT_RATE: num_(il.UNIT_RATE), CREDIT_VALUE: round_(use * num_(il.UNIT_RATE)) };
  });
  requireFields_('SITE_RETURN', h);
  const ids = nextIds_('SITE_RETURN_ITEMS', lines.length);
  lines.forEach(function (l, n) { l.RETURN_ITEM_ID = ids[n]; });
  const plan = prepareLedger_(lines.filter(function (l) { return l.USABLE_QTY > 0; }).map(function (l) {
    return { TXN_TYPE: 'RETURN', REF_SHEET: 'SITE_RETURN_ITEMS', REF_ID: retId, REF_LINE_ID: l.RETURN_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID,
      LOCATION_ID: h.TO_LOCATION_ID, PROJECT_ID: l.PROJECT_ID, STAGE_CODE: l.STAGE_CODE, IN_QTY: l.USABLE_QTY, UNIT_RATE: l.UNIT_RATE,
      TXN_DATE: parseDate_(h.RETURN_DATE) || today_() };
  }));
  h.RETURN_ID = retId;
  insert_('SITE_RETURN', [h]);
  insert_('SITE_RETURN_ITEMS', lines.map(function (l) { const o = Object.assign({}, l); delete o._il; return o; }));
  lines.forEach(function (l) {
    if (l.USABLE_QTY > 0) update_('SITE_ISSUE_ITEMS', l._il, { RETURNED_QTY: round_(num_(l._il.RETURNED_QTY) + l.USABLE_QTY, 3) }, false);
  });
  // damaged part of a return = site wastage (already consumed, no stock effect)
  const dmg = lines.filter(function (l) { return l.DAMAGED_QTY > 0; });
  if (dmg.length) {
    const wids = nextIds_('SITE_WASTAGE', dmg.length);
    insert_('SITE_WASTAGE', dmg.map(function (l, n) {
      return { WASTE_ID: wids[n], WASTE_DATE: h.RETURN_DATE, WASTE_SOURCE: 'SITE', PROJECT_ID: l.PROJECT_ID, STAGE_CODE: l.STAGE_CODE,
        ISSUE_ITEM_ID: l.ISSUE_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID, PRODUCT_NAME: l.PRODUCT_NAME, UOM: l.UOM, WASTE_QTY: l.DAMAGED_QTY,
        WASTE_TYPE: 'SITE DAMAGE', REASON: 'Damaged on return ' + retId, UNIT_RATE: l.UNIT_RATE, WASTE_COST: round_(l.DAMAGED_QTY * l.UNIT_RATE),
        IS_WITHIN_ALLOWANCE: wastageWithinAllowance_(l.PROJECT_ID, l.STAGE_CODE, l.PRODUCT_ID, l.DAMAGED_QTY) ? 'Y' : 'N',
        REPORTED_BY: currentUser_().USER_ID, WASTE_STATUS: 'PENDING' };
    }));
  }
  commitLedger_(plan);
  refreshStockAgg_(lines.map(function (l) { return key_(l.PRODUCT_ID, h.TO_LOCATION_ID); }));
  logAudit_('CREATE', 'SITE_RETURN', retId, '', '', 'RECEIVED');
  return { RETURN_ID: retId, damagedLines: dmg.length };
}

/* ---------------------------------------------------------------- wastage */
/** Is total site wastage (incl. extra) within BOM allowance (GROSS − NET)? */
function wastageWithinAllowance_(projectId, stageCode, productId, extra) {
  const b = bomByKey_(projectId)[key_(stageCode, productId)];
  if (!b) return false;
  const so = sumBy_(rows_('SITE_WASTAGE').filter(function (w) {
    return w.PROJECT_ID === projectId && w.STAGE_CODE === stageCode && w.PRODUCT_ID === productId && w.WASTE_SOURCE === 'SITE' && w.WASTE_STATUS !== 'REJECTED';
  }), function (w) { return w.WASTE_QTY; });
  return so + num_(extra) <= (b.gross - b.net) + 1e-6;
}

/** p: {WASTE_SOURCE (SITE|STORE), PROJECT_ID, STAGE_CODE, ISSUE_ITEM_ID?, LOCATION_ID (STORE), PRODUCT_ID, WASTE_QTY, WASTE_TYPE, REASON, PHOTO_URL, WASTE_DATE} */
function reportWastage_(p) {
  const w = Object.assign({}, p);
  w.WASTE_SOURCE = String(w.WASTE_SOURCE || 'SITE').toUpperCase();
  const pr = product_(w.PRODUCT_ID), q = num_(w.WASTE_QTY);
  if (q <= 0) throw new Error('WASTE_QTY required');
  if (w.WASTE_SOURCE === 'SITE') {
    if (!w.PROJECT_ID || !w.STAGE_CODE) throw new Error('PROJECT_ID and STAGE_CODE required for site wastage');
    const il = w.ISSUE_ITEM_ID ? mustFind_('SITE_ISSUE_ITEMS', 'ISSUE_ITEM_ID', w.ISSUE_ITEM_ID, 'Issue line') : null;
    const issued = rows_('SITE_ISSUE_ITEMS').filter(function (l) { return l.PROJECT_ID === w.PROJECT_ID && l.STAGE_CODE === w.STAGE_CODE && l.PRODUCT_ID === w.PRODUCT_ID; });
    const qty = sumBy_(issued, function (l) { return l.BASE_QTY; }), cost = sumBy_(issued, function (l) { return l.LINE_COST; });
    if (!issued.length) throw new Error('Nothing of this product was issued to this project stage');
    w.UNIT_RATE = il ? num_(il.UNIT_RATE) : round_(qty ? cost / qty : num_(pr.STANDARD_RATE), 4);
    w.IS_WITHIN_ALLOWANCE = wastageWithinAllowance_(w.PROJECT_ID, w.STAGE_CODE, w.PRODUCT_ID, q) ? 'Y' : 'N';
  } else {
    w.LOCATION_ID = w.LOCATION_ID || cfg_('DEFAULT_WAREHOUSE_ID');
    const s = stockRow_(w.PRODUCT_ID, w.LOCATION_ID);
    if (!s || num_(s.ON_HAND_QTY) < q) throw new Error('Not enough stock at ' + w.LOCATION_ID + ' to write off');
    w.UNIT_RATE = num_(s.AVG_RATE);
    w.IS_WITHIN_ALLOWANCE = 'N';
  }
  Object.assign(w, { WASTE_ID: nextIds_('SITE_WASTAGE')[0], WASTE_DATE: w.WASTE_DATE || today_(), PRODUCT_NAME: pr.PRODUCT_NAME, UOM: pr.BASE_UOM,
    WASTE_QTY: q, WASTE_COST: round_(q * w.UNIT_RATE), REPORTED_BY: currentUser_().USER_ID, WASTE_STATUS: 'PENDING' });
  requireFields_('SITE_WASTAGE', w);
  insert_('SITE_WASTAGE', [w]);
  return { WASTE_ID: w.WASTE_ID, withinAllowance: w.IS_WITHIN_ALLOWANCE };
}

function approveWastage_(id, ok, reason) {
  const w = mustFind_('SITE_WASTAGE', 'WASTE_ID', id, 'Wastage');
  if (w.WASTE_STATUS !== 'PENDING') throw new Error('Wastage is ' + w.WASTE_STATUS);
  assertApprove_('WASTAGE', w.WASTE_COST, 'WASTAGE_USAGE');
  if (!ok) { update_('SITE_WASTAGE', w, { WASTE_STATUS: 'REJECTED', REASON: (w.REASON || '') + ' | Rejected: ' + (reason || '') }); return w; }
  let plan = null;
  if (w.WASTE_SOURCE === 'STORE') plan = prepareLedger_([{ TXN_TYPE: 'WASTAGE', REF_SHEET: 'SITE_WASTAGE', REF_ID: w.WASTE_ID, REF_LINE_ID: w.WASTE_ID,
    PRODUCT_ID: w.PRODUCT_ID, LOCATION_ID: w.LOCATION_ID, PROJECT_ID: w.PROJECT_ID, STAGE_CODE: w.STAGE_CODE, OUT_QTY: num_(w.WASTE_QTY) }]);
  update_('SITE_WASTAGE', w, { WASTE_STATUS: 'APPROVED', APPROVED_BY: currentUser_().USER_ID });
  if (plan) { commitLedger_(plan); refreshStockAgg_([key_(w.PRODUCT_ID, w.LOCATION_ID)]); }
  return w;
}

/* ---------------------------------------------------------------- usage log */
/** p: {header:{PROJECT_ID, STAGE_CODE, USAGE_DATE}, items:[{AREA, ELEMENT, PRODUCT_ID, USED_QTY, WORK_DONE, PHOTO_URL}]} – BASE_UOM */
function logUsage_(p) {
  const h = p.header || {};
  const items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && num_(i.USED_QTY) > 0; });
  if (!items.length) throw new Error('Add at least one product with USED_QTY');
  mustFind_('PRJ_PROJECT', 'PROJECT_ID', h.PROJECT_ID, 'Project');
  if (!h.STAGE_CODE) throw new Error('STAGE_CODE required');
  const caches = {}, warnings = [];
  const usedSoFar = {};
  rows_('SITE_USAGE_LOG').forEach(function (u) { if (u.PROJECT_ID === h.PROJECT_ID) usedSoFar[key_(u.STAGE_CODE, u.PRODUCT_ID)] = (usedSoFar[key_(u.STAGE_CODE, u.PRODUCT_ID)] || 0) + num_(u.USED_QTY); });
  const wasted = {};
  rows_('SITE_WASTAGE').forEach(function (w) { if (w.PROJECT_ID === h.PROJECT_ID && w.WASTE_SOURCE === 'SITE' && w.WASTE_STATUS !== 'REJECTED') wasted[key_(w.STAGE_CODE, w.PRODUCT_ID)] = (wasted[key_(w.STAGE_CODE, w.PRODUCT_ID)] || 0) + num_(w.WASTE_QTY); });
  const ids = nextIds_('SITE_USAGE_LOG', items.length);
  const rows = items.map(function (i, n) {
    const pr = product_(i.PRODUCT_ID), k = key_(h.STAGE_CODE, pr.PRODUCT_ID), bal = bomBalance_(h.PROJECT_ID, h.STAGE_CODE, pr.PRODUCT_ID, caches);
    usedSoFar[k] = (usedSoFar[k] || 0) + num_(i.USED_QTY);
    const atSite = bal.issued - (wasted[k] || 0) - usedSoFar[k];
    if (atSite < -1e-6) warnings.push(pr.PRODUCT_NAME + ': logged usage exceeds material at site by ' + round_(-atSite, 3) + ' ' + pr.BASE_UOM);
    return { USAGE_ID: ids[n], USAGE_DATE: h.USAGE_DATE || today_(), PROJECT_ID: h.PROJECT_ID, STAGE_CODE: h.STAGE_CODE, AREA: i.AREA || '', ELEMENT: i.ELEMENT || '',
      BOM_ITEM_ID: bal.bomItemId, PRODUCT_ID: pr.PRODUCT_ID, PRODUCT_NAME: pr.PRODUCT_NAME, UOM: pr.BASE_UOM, USED_QTY: num_(i.USED_QTY),
      WORK_DONE: i.WORK_DONE || '', PHOTO_URL: i.PHOTO_URL || '', REPORTED_BY: currentUser_().USER_ID };
  });
  insert_('SITE_USAGE_LOG', rows);
  return { logged: rows.length, warnings: warnings };
}
