/**
 * ============================================================================
 *  Reports.gs – STAGE 09. Rebuilds RPT_* caches (nightly trigger or button) and handles project closure.
 *  RPT_BOM_VS_ACTUAL: one row per project × stage × product – planned → reserved → PR → PO → received →
 *  issued → returned → wasted → used, plus BALANCE_TO_ISSUE (what is left for the stage).
 * ============================================================================
 */

function rebuildReports_() {
  const t0 = Date.now(), now = new Date(), products = productMap_();
  const R = {};
  const row = function (pid, st, prod) {
    const k = key_(pid, st, prod);
    if (!R[k]) {
      const p = products[prod] || {};
      R[k] = { ROW_KEY: k, PROJECT_ID: pid, STAGE_CODE: st, PRODUCT_ID: prod, PRODUCT_NAME: p.PRODUCT_NAME, UOM: p.BASE_UOM,
        BOM_GROSS_QTY: 0, ALLOCATED_QTY: 0, PR_QTY: 0, PO_QTY: 0, RECEIVED_QTY: 0, ISSUED_QTY: 0, RETURNED_QTY: 0, WASTAGE_QTY: 0, USED_QTY: 0,
        BOM_COST: 0, _issCost: 0, _retCredit: 0, _wasteCost: 0 };
    }
    return R[k];
  };
  const curBom = {};
  rows_('BOM_HEADER').forEach(function (h) { if (h.IS_CURRENT === 'Y' && h.BOM_STATUS === 'APPROVED') curBom[h.BOM_ID] = 1; });
  rows_('BOM_ITEMS').forEach(function (l) {
    if (!curBom[l.BOM_ID]) return;
    const r = row(l.PROJECT_ID, l.STAGE_CODE, l.PRODUCT_ID); r.BOM_GROSS_QTY += num_(l.GROSS_QTY); r.BOM_COST += num_(l.EST_AMOUNT);
  });
  rows_('PRJ_ALLOCATION').forEach(function (a) {
    if (a.ALLOCATION_STATUS !== 'RELEASED') row(a.PROJECT_ID, a.STAGE_CODE, a.PRODUCT_ID).ALLOCATED_QTY += num_(a.ALLOCATED_QTY) - num_(a.RELEASED_QTY);
  });
  const deadPr = {};
  rows_('PUR_PR').forEach(function (h) { if (['REJECTED', 'CANCELLED'].indexOf(h.PR_STATUS) >= 0) deadPr[h.PR_ID] = 1; });
  rows_('PUR_PR_ITEMS').forEach(function (l) {
    if (!l.PROJECT_ID || deadPr[l.PR_ID] || l.LINE_STATUS === 'CANCELLED') return;
    row(l.PROJECT_ID, l.STAGE_CODE, l.PRODUCT_ID).PR_QTY += blank_(l.APPROVED_QTY) ? num_(l.REQUESTED_QTY) : num_(l.APPROVED_QTY);
  });
  rows_('PUR_PO_ITEMS').forEach(function (l) {
    if (!l.PROJECT_ID || l.LINE_STATUS === 'CANCELLED') return;
    const conv = num_((products[l.PRODUCT_ID] || {}).PURCHASE_TO_BASE) || 1;
    row(l.PROJECT_ID, l.STAGE_CODE, l.PRODUCT_ID).PO_QTY += num_(l.ORDERED_QTY) * conv;
  });
  rows_('GRN_ITEMS').forEach(function (l) { if (l.PROJECT_ID) row(l.PROJECT_ID, l.STAGE_CODE, l.PRODUCT_ID).RECEIVED_QTY += num_(l.ACCEPTED_BASE_QTY); });
  rows_('SITE_ISSUE_ITEMS').forEach(function (l) { const r = row(l.PROJECT_ID, l.STAGE_CODE, l.PRODUCT_ID); r.ISSUED_QTY += num_(l.BASE_QTY); r._issCost += num_(l.LINE_COST); });
  rows_('SITE_RETURN_ITEMS').forEach(function (l) { const r = row(l.PROJECT_ID, l.STAGE_CODE, l.PRODUCT_ID); r.RETURNED_QTY += num_(l.USABLE_QTY); r._retCredit += num_(l.CREDIT_VALUE); });
  rows_('SITE_WASTAGE').forEach(function (w) {
    if (w.WASTE_SOURCE !== 'SITE' || w.WASTE_STATUS === 'REJECTED' || !w.PROJECT_ID) return;
    const r = row(w.PROJECT_ID, w.STAGE_CODE, w.PRODUCT_ID); r.WASTAGE_QTY += num_(w.WASTE_QTY); r._wasteCost += num_(w.WASTE_COST);
  });
  rows_('SITE_USAGE_LOG').forEach(function (u) { row(u.PROJECT_ID, u.STAGE_CODE, u.PRODUCT_ID).USED_QTY += num_(u.USED_QTY); });

  const out = Object.keys(R).sort().map(function (k) {
    const r = R[k], net = r.ISSUED_QTY - r.RETURNED_QTY, actual = r._issCost - r._retCredit;
    ['BOM_GROSS_QTY', 'ALLOCATED_QTY', 'PR_QTY', 'PO_QTY', 'RECEIVED_QTY', 'ISSUED_QTY', 'RETURNED_QTY', 'WASTAGE_QTY', 'USED_QTY']
      .forEach(function (f) { r[f] = round_(r[f], 3); });
    return Object.assign(r, { NET_CONSUMED_QTY: round_(net, 3), SITE_BALANCE_QTY: round_(net - r.WASTAGE_QTY - r.USED_QTY, 3),
      BALANCE_TO_ISSUE: round_(Math.max(r.BOM_GROSS_QTY - net, 0), 3), QTY_VARIANCE: round_(net - r.BOM_GROSS_QTY, 3),
      BOM_COST: round_(r.BOM_COST), ACTUAL_COST: round_(actual), COST_VARIANCE: round_(actual - r.BOM_COST), LAST_REBUILT: now });
  });
  writeTable_('RPT_BOM_VS_ACTUAL', out);

  // project × stage × category cost
  const cats = indexBy_(cachedRows_('MST_CATEGORY'), 'CATEGORY_ID'), C = {};
  out.forEach(function (r) {
    const cat = (products[r.PRODUCT_ID] || {}).CATEGORY_ID || '', k = key_(r.PROJECT_ID, r.STAGE_CODE, cat);
    const c = C[k] = C[k] || { PROJECT_ID: r.PROJECT_ID, STAGE_CODE: r.STAGE_CODE, CATEGORY_ID: cat, CATEGORY_NAME: (cats[cat] || {}).CATEGORY_NAME || '',
      BOM_COST: 0, ISSUED_COST: 0, RETURNED_CREDIT: 0, WASTAGE_COST: 0 };
    c.BOM_COST += r.BOM_COST; c.ISSUED_COST += r._issCost; c.RETURNED_CREDIT += r._retCredit; c.WASTAGE_COST += r._wasteCost;
  });
  writeTable_('RPT_PROJECT_COST', Object.keys(C).sort().map(function (k) {
    const c = C[k], net = c.ISSUED_COST - c.RETURNED_CREDIT;
    return Object.assign(c, { BOM_COST: round_(c.BOM_COST), ISSUED_COST: round_(c.ISSUED_COST), RETURNED_CREDIT: round_(c.RETURNED_CREDIT),
      WASTAGE_COST: round_(c.WASTAGE_COST), NET_COST: round_(net), VARIANCE: round_(net - c.BOM_COST), LAST_REBUILT: now });
  }));

  // stage costs back to PRJ_STAGE (one write per column)
  const stageCost = {};
  out.forEach(function (r) { const k = key_(r.PROJECT_ID, r.STAGE_CODE); const s = stageCost[k] = stageCost[k] || { b: 0, a: 0 }; s.b += r.BOM_COST; s.a += r.ACTUAL_COST; });
  writeColumns_('PRJ_STAGE', ['BOM_COST', 'ACTUAL_COST'], rows_('PRJ_STAGE').map(function (s) {
    const c = stageCost[key_(s.PROJECT_ID, s.STAGE_CODE)] || { b: 0, a: 0 };
    return { row: s._row, patch: { BOM_COST: round_(c.b), ACTUAL_COST: round_(c.a) } };
  }));

  writeTable_('RPT_STOCK_MOVEMENT', stockMovement_(now));
  return { rows: out.length, seconds: round_((Date.now() - t0) / 1000, 1) };
}

/** Monthly movement per product × location from INV_LEDGER. */
function stockMovement_(now) {
  const map = { OPENING: 'OPENING_QTY', GRN: 'GRN_QTY', ISSUE: 'ISSUED_QTY', RETURN: 'RETURNED_QTY', WASTAGE: 'WASTAGE_QTY', TRANSFER_IN: 'TRANSFER_IN_QTY',
    TRANSFER_OUT: 'TRANSFER_OUT_QTY', ADJ_IN: 'ADJUSTMENT_QTY', ADJ_OUT: 'ADJUSTMENT_QTY', RTV: 'RTV_QTY', REVERSAL: 'ADJUSTMENT_QTY' };
  const tz = tz_(), groups = {}, products = productMap_();
  rows_('INV_LEDGER').forEach(function (l) {
    const d = l.TXN_DATE instanceof Date ? l.TXN_DATE : parseDate_(l.TXN_DATE);
    const per = d ? Utilities.formatDate(d, tz, 'yyyy-MM') : 'UNKNOWN';
    const pl = key_(l.PRODUCT_ID, l.LOCATION_ID);
    const g = groups[pl] = groups[pl] || {};
    const m = g[per] = g[per] || { inOpen: 0, val: 0, qty: {} };
    const f = map[l.TXN_TYPE] || 'ADJUSTMENT_QTY', signed = num_(l.IN_QTY) - num_(l.OUT_QTY);
    if (l.TXN_TYPE === 'OPENING') m.inOpen += signed;
    else m.qty[f] = (m.qty[f] || 0) + (f === 'ADJUSTMENT_QTY' ? signed : num_(l.IN_QTY) + num_(l.OUT_QTY));
    m.net = (m.net || 0) + signed; m.val += num_(l.TXN_VALUE);
  });
  const out = [];
  Object.keys(groups).sort().forEach(function (pl) {
    const parts = pl.split('|');
    let closing = 0, value = 0;
    Object.keys(groups[pl]).sort().forEach(function (per) {
      const m = groups[pl][per], open = closing + m.inOpen;
      closing += m.net; value += m.val;
      out.push(Object.assign({ PERIOD: per, PRODUCT_ID: parts[0], PRODUCT_NAME: (products[parts[0]] || {}).PRODUCT_NAME, LOCATION_ID: parts[1],
        OPENING_QTY: round_(open, 3), GRN_QTY: 0, ISSUED_QTY: 0, RETURNED_QTY: 0, WASTAGE_QTY: 0, TRANSFER_IN_QTY: 0, TRANSFER_OUT_QTY: 0,
        ADJUSTMENT_QTY: 0, RTV_QTY: 0 }, roundAll_(m.qty), { CLOSING_QTY: round_(closing, 3), CLOSING_VALUE: round_(value), LAST_REBUILT: now }));
    });
  });
  return out;
}
function roundAll_(o) { const r = {}; Object.keys(o).forEach(function (k) { r[k] = round_(o[k], 3); }); return r; }

/* ---------------------------------------------------------------- closure */
function prepareClosure_(p) {
  const proj = mustFind_('PRJ_PROJECT', 'PROJECT_ID', p.PROJECT_ID, 'Project');
  rebuildReports_();
  const tr = rows_('RPT_BOM_VS_ACTUAL').filter(function (r) { return r.PROJECT_ID === proj.PROJECT_ID; });
  const cost = rows_('RPT_PROJECT_COST').filter(function (r) { return r.PROJECT_ID === proj.PROJECT_ID; });
  const bom = sumBy_(cost, function (r) { return r.BOM_COST; }), iss = sumBy_(cost, function (r) { return r.ISSUED_COST; });
  const ret = sumBy_(cost, function (r) { return r.RETURNED_CREDIT; }), waste = sumBy_(cost, function (r) { return r.WASTAGE_COST; });
  const net = iss - ret;
  const stages = rows_('PRJ_STAGE').filter(function (s) { return s.PROJECT_ID === proj.PROJECT_ID; });
  const poIds = {};
  rows_('PUR_PO_ITEMS').forEach(function (l) { if (l.PROJECT_ID === proj.PROJECT_ID) poIds[l.PO_ID] = 1; });
  const openPo = rows_('PUR_PO').some(function (h) { return (poIds[h.PO_ID] || h.PROJECT_ID === proj.PROJECT_ID) && ['RECEIVED', 'CLOSED', 'CANCELLED'].indexOf(h.PO_STATUS) < 0; });
  const openAlloc = rows_('PRJ_ALLOCATION').some(function (a) { return a.PROJECT_ID === proj.PROJECT_ID && num_(a.OPEN_QTY) > 0 && a.ALLOCATION_STATUS !== 'RELEASED'; });
  const siteLeft = tr.some(function (r) { return num_(r.SITE_BALANCE_QTY) > 0.001; });
  const rec = { PROJECT_ID: proj.PROJECT_ID, CLOSURE_DATE: today_(), BOM_COST: round_(bom), ISSUED_COST: round_(iss), RETURNED_CREDIT: round_(ret),
    WASTAGE_COST: round_(waste), NET_MATERIAL_COST: round_(net), COST_VARIANCE: round_(net - bom), VARIANCE_PCT: bom ? round_((net - bom) / bom * 100, 2) : 0,
    ALL_STAGES_COMPLETED: stages.length && stages.every(function (s) { return ['COMPLETED', 'SKIPPED'].indexOf(s.STAGE_STATUS) >= 0; }) ? 'Y' : 'N',
    ALL_PO_CLOSED: openPo ? 'N' : 'Y', SITE_STOCK_CLEARED: siteLeft ? 'N' : 'Y', ALLOCATIONS_RELEASED: openAlloc ? 'N' : 'Y', REMARKS: p.REMARKS || '',
    CLOSED_BY: currentUser_().USER_ID };
  rec.CLOSURE_STATUS = ['ALL_STAGES_COMPLETED', 'ALL_PO_CLOSED', 'SITE_STOCK_CLEARED', 'ALLOCATIONS_RELEASED'].every(function (k) { return rec[k] === 'Y'; }) ? 'PENDING APPROVAL' : 'DRAFT';
  const ex = rows_('PRJ_CLOSURE').find(function (c) { return c.PROJECT_ID === proj.PROJECT_ID && c.CLOSURE_STATUS !== 'CLOSED'; });
  if (ex) update_('PRJ_CLOSURE', ex, rec);
  else { rec.CLOSURE_ID = nextIds_('PRJ_CLOSURE')[0]; insert_('PRJ_CLOSURE', [rec]); }
  return serialize_(ex || rec);
}

function approveClosure_(id, ok, reason) {
  const c = mustFind_('PRJ_CLOSURE', 'CLOSURE_ID', id, 'Closure');
  if (c.CLOSURE_STATUS !== 'PENDING APPROVAL') throw new Error('Closure is ' + c.CLOSURE_STATUS + ' – all checklist items must be Y');
  assertApprove_('CLOSURE', Math.abs(num_(c.COST_VARIANCE)), 'CLOSURE');
  if (!ok) { update_('PRJ_CLOSURE', c, { CLOSURE_STATUS: 'DRAFT', REMARKS: (c.REMARKS || '') + ' | Rejected: ' + (reason || '') }); return c; }
  releaseAllocation_({ PROJECT_ID: c.PROJECT_ID });
  update_('PRJ_CLOSURE', c, { CLOSURE_STATUS: 'CLOSED', APPROVED_BY: currentUser_().USER_ID });
  update_('PRJ_PROJECT', mustFind_('PRJ_PROJECT', 'PROJECT_ID', c.PROJECT_ID), { PROJECT_STATUS: 'COMPLETED', ACTUAL_END_DATE: today_() });
  return c;
}

/* ---------------------------------------------------------------- dashboard & approvals inbox */
function dashboard_() {
  const projects = rows_('PRJ_PROJECT');
  const stock = rows_('INV_STOCK');
  const pend = pendingApprovals_();
  return {
    activeProjects: projects.filter(function (p) { return ['COMPLETED', 'CANCELLED'].indexOf(p.PROJECT_STATUS) < 0; }).length,
    stockValue: round_(sumBy_(stock, function (s) { return s.STOCK_VALUE; })),
    lowStock: stock.filter(function (s) { return s.REORDER_STATUS === 'LOW' || s.REORDER_STATUS === 'OUT'; })
      .slice(0, 25).map(function (s) { return { PRODUCT_ID: s.PRODUCT_ID, PRODUCT_NAME: s.PRODUCT_NAME, LOCATION_ID: s.LOCATION_ID, ON_HAND_QTY: s.ON_HAND_QTY, REORDER_LEVEL: s.REORDER_LEVEL, REORDER_STATUS: s.REORDER_STATUS }; }),
    openPOs: rows_('PUR_PO').filter(function (p) { return ['APPROVED', 'SENT TO SUPPLIER', 'PARTIALLY RECEIVED'].indexOf(p.PO_STATUS) >= 0; }).length,
    pendingApprovals: pend.length,
    projects: projects.filter(function (p) { return ['COMPLETED', 'CANCELLED'].indexOf(p.PROJECT_STATUS) < 0; }).slice(0, 50)
      .map(function (p) { return { PROJECT_ID: p.PROJECT_ID, PROJECT_NAME: p.PROJECT_NAME, CLIENT_NAME: p.CLIENT_NAME, PROJECT_STATUS: p.PROJECT_STATUS,
        CURRENT_STAGE_CODE: p.CURRENT_STAGE_CODE, MATERIAL_BUDGET: p.MATERIAL_BUDGET }; })
  };
}

/** Everything waiting for approval that THIS user is allowed to approve. */
function pendingApprovals_() {
  const out = [];
  const add = function (doc, id, date, project, value, status, note, docType, module) {
    if (canApprove_(docType, value, module)) out.push({ doc: doc, id: id, date: fmtVal_(date), project: project || '', value: round_(value), status: status, note: note || '' });
  };
  rows_('BOM_HEADER').forEach(function (r) { if (r.BOM_STATUS === 'SUBMITTED') add('BOM', r.BOM_ID, r.PREPARED_DATE, r.PROJECT_ID, r.TOTAL_ESTIMATED_COST, r.BOM_STATUS, 'v' + r.BOM_VERSION + ' ' + (r.REVISION_REASON || ''), 'BOM', 'BOM'); });
  rows_('PUR_PR').forEach(function (r) { if (r.PR_STATUS === 'PENDING APPROVAL') add('PR', r.PR_ID, r.PR_DATE, r.PROJECT_ID, r.ESTIMATED_VALUE, r.PR_STATUS, r.REASON, 'PR', 'PURCHASE_REQUEST'); });
  rows_('PUR_PO').forEach(function (r) { if (r.PO_STATUS === 'PENDING APPROVAL') add('PO', r.PO_ID, r.PO_DATE, r.PROJECT_ID, r.GRAND_TOTAL, r.PO_STATUS, r.SUPPLIER_ID, 'PO', 'PURCHASE_ORDER'); });
  rows_('SITE_MR').forEach(function (r) { if (r.MR_STATUS === 'SUBMITTED') add('MR', r.MR_ID, r.MR_DATE, r.PROJECT_ID, 0, r.MR_STATUS, (r.HAS_EXTRA_TO_BOM === 'Y' ? 'EXTRA TO BOM · ' : '') + r.STAGE_CODE, 'SITE_MR', 'SITE_REQUEST'); });
  rows_('SITE_WASTAGE').forEach(function (r) { if (r.WASTE_STATUS === 'PENDING') add('WASTAGE', r.WASTE_ID, r.WASTE_DATE, r.PROJECT_ID, r.WASTE_COST, r.WASTE_STATUS, r.PRODUCT_NAME + ' × ' + r.WASTE_QTY + (r.IS_WITHIN_ALLOWANCE === 'Y' ? ' (within allowance)' : ' (OVER allowance)'), 'WASTAGE', 'WASTAGE_USAGE'); });
  rows_('INV_ADJUSTMENT').forEach(function (r) { if (r.ADJ_STATUS === 'PENDING') add('ADJUSTMENT', r.ADJ_ID, r.ADJ_DATE, '', Math.abs(num_(r.VALUE_IMPACT)), r.ADJ_STATUS, r.PRODUCT_ID + ' diff ' + r.DIFFERENCE_QTY, 'ADJUSTMENT', 'INVENTORY'); });
  if (can_('MASTERS', 'A') || can_('MASTERS', 'E'))
    rows_('MST_USER').forEach(function (r) { if (String(r.STATUS).toUpperCase() === 'PENDING') out.push({ doc: 'USER', id: r.USER_ID, date: fmtVal_(r.CREATED_AT), project: '', value: 0, status: 'PENDING', note: 'New registration: ' + r.FULL_NAME + ' · ' + r.EMAIL + ' · role ' + r.ROLE }); });
  rows_('PRJ_CLOSURE').forEach(function (r) { if (r.CLOSURE_STATUS === 'PENDING APPROVAL') add('CLOSURE', r.CLOSURE_ID, r.CLOSURE_DATE, r.PROJECT_ID, Math.abs(num_(r.COST_VARIANCE)), r.CLOSURE_STATUS, 'Variance ' + r.VARIANCE_PCT + '%', 'CLOSURE', 'CLOSURE'); });
  return out;
}

/** p: {doc, id, approve: true|false, reason, qty?} */
function approveDoc_(p) {
  const ok = p.approve !== false;
  const fns = { USER: approveUser_, BOM: approveBom_, PR: approvePr_, PO: approvePo_, MR: approveMr_, WASTAGE: approveWastage_, ADJUSTMENT: approveAdjustment_, CLOSURE: approveClosure_ };
  const fn = fns[p.doc];
  if (!fn) throw new Error('Unknown document type ' + p.doc);
  if (!ok && blank_(p.reason)) throw new Error('Reason is required to reject');
  const r = p.doc === 'PR' ? fn(p.id, ok, p.reason, p.qty) : fn(p.id, ok, p.reason);
  logAudit_(ok ? 'APPROVE' : 'REJECT', p.doc, p.id, '', '', p.reason || '');
  return { doc: p.doc, id: p.id, approved: ok };
}
