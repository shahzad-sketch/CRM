/**
 * ============================================================================
 *  Bom.gs – STAGE 03 (BOM) + STAGE 04 (allocation / shortage planning).
 *  Flow: saveBom (DRAFT) -> submitBom -> approve (APPROVED, IS_CURRENT=Y, budget set)
 *        -> planBom: reserve free stock (PRJ_ALLOCATION) + raise PR for the shortage.
 *  A revision = saveBom on the same project without BOM_ID -> new version; on approval the old one is SUPERSEDED.
 * ============================================================================
 */

/** p: {header:{BOM_ID?, PROJECT_ID, BOM_TYPE, DRAWING_REF, PREPARED_DATE, REVISION_REASON, REMARKS}, items:[{STAGE_CODE, AREA, ELEMENT, PRODUCT_ID, NET_QTY, WASTAGE_PCT, EST_RATE, MATERIAL_SOURCE, REMARKS}]} */
function saveBom_(p) {
  const h = Object.assign({}, p.header || {});
  const items = (p.items || []).filter(function (i) { return i.PRODUCT_ID && num_(i.NET_QTY) > 0; });
  if (!items.length) throw new Error('Add at least one BOM line with product and NET_QTY');
  const proj = mustFind_('PRJ_PROJECT', 'PROJECT_ID', h.PROJECT_ID, 'Project');
  const stages = indexBy_(cachedRows_('MST_WORK_STAGE'), 'STAGE_CODE');
  let hdr = null;
  if (!blank_(h.BOM_ID)) {
    hdr = mustFind_('BOM_HEADER', 'BOM_ID', h.BOM_ID, 'BOM');
    if (['DRAFT', 'REJECTED'].indexOf(hdr.BOM_STATUS) < 0) throw new Error('BOM ' + hdr.BOM_ID + ' is ' + hdr.BOM_STATUS + '. Only DRAFT/REJECTED can be edited – save without BOM_ID to create a revision.');
    deleteRows_('BOM_ITEMS', rows_('BOM_ITEMS').filter(function (r) { return r.BOM_ID === hdr.BOM_ID; }));
  }
  const bomId = hdr ? hdr.BOM_ID : nextIds_('BOM_HEADER')[0];
  const ids = nextIds_('BOM_ITEMS', items.length), defW = num_(cfg_('DEFAULT_WASTAGE_PCT')), uoms = uomMap_();
  let total = 0;
  const lines = items.map(function (it, i) {
    const pr = product_(it.PRODUCT_ID);
    if (!stages[it.STAGE_CODE]) throw new Error('Line ' + (i + 1) + ': invalid STAGE_CODE ' + it.STAGE_CODE);
    const w = !blank_(it.WASTAGE_PCT) ? num_(it.WASTAGE_PCT) : (!blank_(pr.STANDARD_WASTAGE_PCT) ? num_(pr.STANDARD_WASTAGE_PCT) : defW);
    const net = num_(it.NET_QTY);
    let gross = net * (1 + w / 100);
    const u = uoms[pr.BASE_UOM];
    gross = (u && String(u.DECIMAL_ALLOWED).toUpperCase() === 'N') ? Math.ceil(gross - 1e-9) : round_(gross, 3);
    const rate = !blank_(it.EST_RATE) ? num_(it.EST_RATE) : num_(pr.STANDARD_RATE);
    const amt = round_(gross * rate);
    total += amt;
    return { BOM_ITEM_ID: ids[i], BOM_ID: bomId, PROJECT_ID: proj.PROJECT_ID, STAGE_CODE: it.STAGE_CODE, AREA: it.AREA, ELEMENT: it.ELEMENT,
      PRODUCT_ID: pr.PRODUCT_ID, PRODUCT_NAME: pr.PRODUCT_NAME, UOM: pr.BASE_UOM, NET_QTY: net, WASTAGE_PCT: w, GROSS_QTY: gross,
      EST_RATE: rate, EST_AMOUNT: amt, MATERIAL_SOURCE: it.MATERIAL_SOURCE || 'TO PURCHASE', REMARKS: it.REMARKS };
  });
  insert_('BOM_ITEMS', lines);
  if (hdr) {
    update_('BOM_HEADER', hdr, { BOM_TYPE: h.BOM_TYPE || hdr.BOM_TYPE, DRAWING_REF: h.DRAWING_REF, REVISION_REASON: h.REVISION_REASON,
      REMARKS: h.REMARKS, TOTAL_LINES: lines.length, TOTAL_ESTIMATED_COST: round_(total), BOM_STATUS: 'DRAFT' });
  } else {
    const versions = rows_('BOM_HEADER').filter(function (r) { return r.PROJECT_ID === proj.PROJECT_ID; });
    const ver = versions.reduce(function (m, r) { return Math.max(m, num_(r.BOM_VERSION)); }, 0) + 1;
    const cur = versions.find(function (r) { return r.IS_CURRENT === 'Y'; });
    if (ver > 1 && blank_(h.REVISION_REASON)) throw new Error('This project already has a BOM. REVISION_REASON is required for version ' + ver + '.');
    insert_('BOM_HEADER', [{ BOM_ID: bomId, PROJECT_ID: proj.PROJECT_ID, BOM_VERSION: ver, BOM_TYPE: h.BOM_TYPE || (ver > 1 ? 'CHANGE ORDER' : 'DESIGN FINAL'),
      PARENT_BOM_ID: cur ? cur.BOM_ID : '', DRAWING_REF: h.DRAWING_REF, PREPARED_BY: currentUser_().USER_ID, PREPARED_DATE: h.PREPARED_DATE || today_(),
      TOTAL_LINES: lines.length, TOTAL_ESTIMATED_COST: round_(total), BOM_STATUS: 'DRAFT', IS_CURRENT: 'N', REVISION_REASON: h.REVISION_REASON, REMARKS: h.REMARKS }]);
    logAudit_('CREATE', 'BOM_HEADER', bomId, '', '', 'DRAFT');
    if (['CLOSED - AWAITING KICKOFF', 'DESIGN'].indexOf(proj.PROJECT_STATUS) >= 0) update_('PRJ_PROJECT', proj, { PROJECT_STATUS: 'BOM IN PROGRESS' });
  }
  return { BOM_ID: bomId, lines: lines.length, total: round_(total) };
}

function submitBom_(p) {
  const h = mustFind_('BOM_HEADER', 'BOM_ID', p.BOM_ID, 'BOM');
  if (['DRAFT', 'REJECTED'].indexOf(h.BOM_STATUS) < 0) throw new Error('BOM is ' + h.BOM_STATUS);
  update_('BOM_HEADER', h, { BOM_STATUS: 'SUBMITTED' });
  return { BOM_ID: h.BOM_ID, status: 'SUBMITTED' };
}

function approveBom_(id, ok, reason) {
  const h = mustFind_('BOM_HEADER', 'BOM_ID', id, 'BOM');
  if (h.BOM_STATUS !== 'SUBMITTED') throw new Error('Only SUBMITTED BOMs can be approved (this one is ' + h.BOM_STATUS + ')');
  assertApprove_('BOM', h.TOTAL_ESTIMATED_COST, 'BOM');
  if (!ok) { update_('BOM_HEADER', h, { BOM_STATUS: 'REJECTED', REMARKS: reason || h.REMARKS }); return h; }
  rows_('BOM_HEADER').forEach(function (r) {
    if (r.PROJECT_ID === h.PROJECT_ID && r.BOM_ID !== h.BOM_ID && r.IS_CURRENT === 'Y') update_('BOM_HEADER', r, { IS_CURRENT: 'N', BOM_STATUS: 'SUPERSEDED' });
  });
  update_('BOM_HEADER', h, { BOM_STATUS: 'APPROVED', IS_CURRENT: 'Y', APPROVED_BY: currentUser_().USER_ID, APPROVED_DATE: today_() });
  const proj = mustFind_('PRJ_PROJECT', 'PROJECT_ID', h.PROJECT_ID);
  const patch = { MATERIAL_BUDGET: h.TOTAL_ESTIMATED_COST, CURRENT_BOM_ID: h.BOM_ID };
  if (['CLOSED - AWAITING KICKOFF', 'DESIGN', 'BOM IN PROGRESS'].indexOf(proj.PROJECT_STATUS) >= 0) patch.PROJECT_STATUS = 'EXECUTION';
  update_('PRJ_PROJECT', proj, patch);
  // stage BOM cost
  const byStage = {};
  rows_('BOM_ITEMS').forEach(function (l) { if (l.BOM_ID === h.BOM_ID) byStage[l.STAGE_CODE] = (byStage[l.STAGE_CODE] || 0) + num_(l.EST_AMOUNT); });
  rows_('PRJ_STAGE').forEach(function (s) {
    if (s.PROJECT_ID === h.PROJECT_ID) update_('PRJ_STAGE', s, { BOM_COST: round_(byStage[s.STAGE_CODE] || 0) }, false);
  });
  return h;
}

/** Lines of the current approved BOM for a project. */
function currentBomItems_(projectId) {
  const cur = rows_('BOM_HEADER').find(function (r) { return r.PROJECT_ID === projectId && r.IS_CURRENT === 'Y' && r.BOM_STATUS === 'APPROVED'; });
  if (!cur) return [];
  return rows_('BOM_ITEMS').filter(function (l) { return l.BOM_ID === cur.BOM_ID; });
}

/** Aggregate current BOM by stage|product: {gross, net, cost, bomItemId, source}. */
function bomByKey_(projectId) {
  const out = {};
  currentBomItems_(projectId).forEach(function (l) {
    const k = key_(l.STAGE_CODE, l.PRODUCT_ID);
    const o = out[k] = out[k] || { STAGE_CODE: l.STAGE_CODE, PRODUCT_ID: l.PRODUCT_ID, gross: 0, net: 0, cost: 0, bomItemId: l.BOM_ITEM_ID, source: l.MATERIAL_SOURCE };
    o.gross += num_(l.GROSS_QTY); o.net += num_(l.NET_QTY); o.cost += num_(l.EST_AMOUNT);
  });
  return out;
}

/**
 * STAGE 04 – Plan the current BOM: for each stage|product compute what is still uncovered
 *   need = BOM gross − active allocations − open PR qty − issues made without allocation
 * then reserve free stock at LOCATION_ID and raise one PR (source BOM SHORTAGE) for the rest.
 * p: {PROJECT_ID, LOCATION_ID?, REQUIRED_DATE?}
 */
function planBom_(p) {
  const proj = mustFind_('PRJ_PROJECT', 'PROJECT_ID', p.PROJECT_ID, 'Project');
  const loc = p.LOCATION_ID || cfg_('DEFAULT_WAREHOUSE_ID');
  mustFind_('MST_LOCATION', 'LOCATION_ID', loc, 'Location');
  const bom = bomByKey_(proj.PROJECT_ID);
  if (!Object.keys(bom).length) throw new Error('Project has no APPROVED current BOM');
  const covered = {};
  const add = function (k, q) { covered[k] = (covered[k] || 0) + q; };
  rows_('PRJ_ALLOCATION').forEach(function (a) {
    if (a.PROJECT_ID === proj.PROJECT_ID && a.ALLOCATION_STATUS !== 'RELEASED') add(key_(a.STAGE_CODE, a.PRODUCT_ID), num_(a.ALLOCATED_QTY) - num_(a.RELEASED_QTY));
  });
  const deadPr = {};
  rows_('PUR_PR').forEach(function (r) { if (['REJECTED', 'CANCELLED'].indexOf(r.PR_STATUS) >= 0) deadPr[r.PR_ID] = 1; });
  rows_('PUR_PR_ITEMS').forEach(function (l) {
    if (l.PROJECT_ID === proj.PROJECT_ID && !deadPr[l.PR_ID] && l.LINE_STATUS !== 'CANCELLED')
      add(key_(l.STAGE_CODE, l.PRODUCT_ID), blank_(l.APPROVED_QTY) ? num_(l.REQUESTED_QTY) : num_(l.APPROVED_QTY));
  });
  rows_('SITE_ISSUE_ITEMS').forEach(function (l) {
    if (l.PROJECT_ID === proj.PROJECT_ID && blank_(l.ALLOCATION_ID)) add(key_(l.STAGE_CODE, l.PRODUCT_ID), num_(l.BASE_QTY) - num_(l.RETURNED_QTY));
  });
  const free = {}; // product -> free qty at loc (shared across stages)
  const allocs = [], prLines = [];
  Object.keys(bom).sort().forEach(function (k) {
    const b = bom[k];
    if (['CLIENT SUPPLIED', 'CONTRACTOR SUPPLIED'].indexOf(b.source) >= 0) return;
    let need = round_(b.gross - (covered[k] || 0), 3);
    if (need <= 0) return;
    if (free[b.PRODUCT_ID] === undefined) { const s = stockRow_(b.PRODUCT_ID, loc); free[b.PRODUCT_ID] = s ? Math.max(num_(s.AVAILABLE_QTY), 0) : 0; }
    const take = Math.min(need, free[b.PRODUCT_ID]);
    if (take > 0) {
      allocs.push({ STAGE_CODE: b.STAGE_CODE, BOM_ITEM_ID: b.bomItemId, PRODUCT_ID: b.PRODUCT_ID, qty: round_(take, 3) });
      free[b.PRODUCT_ID] -= take; need = round_(need - take, 3);
    }
    if (need > 0 && b.source !== 'FROM STOCK') prLines.push({ STAGE_CODE: b.STAGE_CODE, BOM_ITEM_ID: b.bomItemId, PRODUCT_ID: b.PRODUCT_ID, qty: need });
    if (need > 0 && b.source === 'FROM STOCK') prLines.push({ STAGE_CODE: b.STAGE_CODE, BOM_ITEM_ID: b.bomItemId, PRODUCT_ID: b.PRODUCT_ID, qty: need, note: 'Stock short' });
  });
  // write allocations
  if (allocs.length) {
    const ids = nextIds_('PRJ_ALLOCATION', allocs.length);
    insert_('PRJ_ALLOCATION', allocs.map(function (a, i) {
      return { ALLOCATION_ID: ids[i], ALLOCATION_DATE: today_(), PROJECT_ID: proj.PROJECT_ID, STAGE_CODE: a.STAGE_CODE, BOM_ITEM_ID: a.BOM_ITEM_ID,
        PRODUCT_ID: a.PRODUCT_ID, LOCATION_ID: loc, ALLOCATED_QTY: a.qty, CONSUMED_QTY: 0, RELEASED_QTY: 0, OPEN_QTY: a.qty,
        ALLOCATION_STATUS: 'ACTIVE', ALLOCATED_BY: currentUser_().USER_ID };
    }));
    refreshStockAgg_(allocs.map(function (a) { return key_(a.PRODUCT_ID, loc); }));
  }
  // write PR
  let prId = '';
  if (prLines.length) {
    const products = productMap_();
    const maxLead = prLines.reduce(function (m, l) { return Math.max(m, num_((products[l.PRODUCT_ID] || {}).LEAD_TIME_DAYS)); }, 0);
    const req = p.REQUIRED_DATE ? parseDate_(p.REQUIRED_DATE) : addDays_(today_(), Math.max(maxLead, 3));
    prId = createPrInternal_({ PR_SOURCE: 'BOM SHORTAGE', PROJECT_ID: proj.PROJECT_ID, BOM_ID: proj.CURRENT_BOM_ID, REQUIRED_DATE: req,
      PRIORITY: 'HIGH', REASON: 'Auto: BOM shortage after stock allocation', DEPARTMENT: 'PROJECTS' },
      prLines.map(function (l) { return { STAGE_CODE: l.STAGE_CODE, BOM_ITEM_ID: l.BOM_ITEM_ID, PRODUCT_ID: l.PRODUCT_ID, REQUESTED_QTY: l.qty, REMARKS: l.note || '' }; }));
  }
  rows_('PRJ_STAGE').forEach(function (s) {
    if (s.PROJECT_ID === proj.PROJECT_ID && s.STAGE_STATUS === 'NOT STARTED' && prLines.some(function (l) { return l.STAGE_CODE === s.STAGE_CODE; }))
      update_('PRJ_STAGE', s, { STAGE_STATUS: 'MATERIAL PENDING' }, false);
  });
  return { allocated: allocs.length, prLines: prLines.length, PR_ID: prId };
}

/** Release open qty of an allocation (or all allocations of a project) back to free stock. p: {ALLOCATION_ID} | {PROJECT_ID} */
function releaseAllocation_(p) {
  const list = rows_('PRJ_ALLOCATION').filter(function (a) {
    return (p.ALLOCATION_ID ? a.ALLOCATION_ID === p.ALLOCATION_ID : a.PROJECT_ID === p.PROJECT_ID) &&
      ['ACTIVE', 'PARTIALLY CONSUMED'].indexOf(a.ALLOCATION_STATUS) >= 0;
  });
  list.forEach(function (a) {
    const open = num_(a.OPEN_QTY);
    update_('PRJ_ALLOCATION', a, { RELEASED_QTY: round_(num_(a.RELEASED_QTY) + open, 3), OPEN_QTY: 0,
      ALLOCATION_STATUS: num_(a.CONSUMED_QTY) > 0 ? 'FULLY CONSUMED' : 'RELEASED' });
  });
  refreshStockAgg_(list.map(function (a) { return key_(a.PRODUCT_ID, a.LOCATION_ID); }));
  return { released: list.length };
}

/** Consume allocations FIFO for an issue. Returns first ALLOCATION_ID used and qty covered. */
function consumeAllocations_(projectId, stageCode, productId, locationId, qty) {
  let left = qty, first = '';
  rows_('PRJ_ALLOCATION').filter(function (a) {
    return a.PROJECT_ID === projectId && a.STAGE_CODE === stageCode && a.PRODUCT_ID === productId && a.LOCATION_ID === locationId &&
      ['ACTIVE', 'PARTIALLY CONSUMED'].indexOf(a.ALLOCATION_STATUS) >= 0 && num_(a.OPEN_QTY) > 0;
  }).forEach(function (a) {
    if (left <= 0) return;
    const use = Math.min(left, num_(a.OPEN_QTY)), open = round_(num_(a.OPEN_QTY) - use, 3);
    update_('PRJ_ALLOCATION', a, { CONSUMED_QTY: round_(num_(a.CONSUMED_QTY) + use, 3), OPEN_QTY: open,
      ALLOCATION_STATUS: open > 0 ? 'PARTIALLY CONSUMED' : 'FULLY CONSUMED' }, false);
    if (!first) first = a.ALLOCATION_ID;
    left -= use;
  });
  return { allocationId: first, covered: round_(qty - Math.max(left, 0), 3) };
}

/** Open allocation qty for this project/stage/product at a location (used for free-stock check). */
function openAllocationFor_(projectId, stageCode, productId, locationId) {
  return sumBy_(rows_('PRJ_ALLOCATION').filter(function (a) {
    return a.PROJECT_ID === projectId && a.STAGE_CODE === stageCode && a.PRODUCT_ID === productId && a.LOCATION_ID === locationId &&
      ['ACTIVE', 'PARTIALLY CONSUMED'].indexOf(a.ALLOCATION_STATUS) >= 0;
  }), function (a) { return a.OPEN_QTY; });
}
