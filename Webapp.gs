/**
 * ============================================================================
 *  WebApp.gs – entry point. The browser calls ONE server function: api(action, payload).
 *  Each action declares its module/permission and whether it writes (writes run under one script lock,
 *  so two users can never take the same ID or the same stock at the same time).
 * ============================================================================
 */
function doGet() {
  return HtmlService.createTemplateFromFile('Index').evaluate()
    .setTitle(APP_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(file) { return HtmlService.createHtmlOutputFromFile(file).getContent(); }

/* m = module, p = permission (V/C/E/A), w = write (lock). Module '' = checked inside the function.
 * fn is a small wrapper, so the target function is looked up only when called – the order of files
 * in the Apps Script editor does not matter. f = target name (used in error messages). */
const PUBLIC_ACTIONS = ['login', 'register', 'registerOptions'];   // the only actions allowed without logging in

const ACTIONS = {
  login:              { fn: function (p) { return login_(p); }, f: 'login_', w: true },
  register:           { fn: function (p) { return register_(p); }, f: 'register_', w: true },
  registerOptions:    { fn: function (p) { return registerOptions_(p); }, f: 'registerOptions_' },
  logout:             { fn: function (p) { return logout_(p); }, f: 'logout_' },
  changePassword:     { fn: function (p) { return changePassword_(p); }, f: 'changePassword_', w: true },
  resetPassword:      { fn: function (p) { return resetPassword_(p); }, f: 'resetPassword_', w: true },
  syncSupport:        { fn: function (p) { return syncSupport_(Object.assign({ force: true }, p)); }, f: 'syncSupport_', m: 'MASTERS', p: 'E', w: true },
  bootstrap:          { fn: function (p) { return bootstrap_(p); }, f: 'bootstrap_' },
  dashboard:          { fn: function (p) { return dashboard_(p); }, f: 'dashboard_' },
  pendingApprovals:   { fn: function (p) { return pendingApprovals_(p); }, f: 'pendingApprovals_' },
  list:               { fn: function (p) { return apiList_(p); }, f: 'apiList_' },
  getDoc:             { fn: function (p) { return getDoc_(p); }, f: 'getDoc_' },
  options:            { fn: function (p) { return refOptions_(p); }, f: 'refOptions_' },
  saveRecord:         { fn: function (p) { return saveRecord_(p); }, f: 'saveRecord_', w: true },
  approve:            { fn: function (p) { return approveDoc_(p); }, f: 'approveDoc_', w: true },
  // 02 project
  syncLeads:          { fn: function (p) { return syncLeads_(p); }, f: 'syncLeads_', m: 'PROJECT', p: 'E', w: true },
  createStagePlan:    { fn: function (p) { return createStagePlan_(p); }, f: 'createStagePlan_', m: 'PROJECT', p: 'C', w: true },
  updateStage:        { fn: function (p) { return updateStage_(p); }, f: 'updateStage_', m: 'PROJECT', p: 'E', w: true },
  projectOverview:    { fn: function (p) { return projectOverview_(p); }, f: 'projectOverview_', m: 'PROJECT', p: 'V' },
  // 03 BOM / 04 allocation
  saveBom:            { fn: function (p) { return saveBom_(p); }, f: 'saveBom_', m: 'BOM', p: 'C', w: true },
  submitBom:          { fn: function (p) { return submitBom_(p); }, f: 'submitBom_', m: 'BOM', p: 'C', w: true },
  planBom:            { fn: function (p) { return planBom_(p); }, f: 'planBom_', m: 'ALLOCATION', p: 'C', w: true },
  releaseAllocation:  { fn: function (p) { return releaseAllocation_(p); }, f: 'releaseAllocation_', m: 'ALLOCATION', p: 'E', w: true },
  // 05 procurement
  createPr:           { fn: function (p) { return createPr_(p); }, f: 'createPr_', m: 'PURCHASE_REQUEST', p: 'C', w: true },
  addQuote:           { fn: function (p) { return addQuote_(p); }, f: 'addQuote_', m: 'PURCHASE_REQUEST', p: 'C', w: true },
  selectQuote:        { fn: function (p) { return selectQuote_(p); }, f: 'selectQuote_', m: 'PURCHASE_REQUEST', p: 'E', w: true },
  prLinesForPo:       { fn: function (p) { return prLinesForPo_(p); }, f: 'prLinesForPo_', m: 'PURCHASE_ORDER', p: 'C' },
  createPo:           { fn: function (p) { return createPo_(p); }, f: 'createPo_', m: 'PURCHASE_ORDER', p: 'C', w: true },
  markPoSent:         { fn: function (p) { return markPoSent_(p); }, f: 'markPoSent_', m: 'PURCHASE_ORDER', p: 'E', w: true },
  cancelPo:           { fn: function (p) { return cancelPo_(p); }, f: 'cancelPo_', m: 'PURCHASE_ORDER', p: 'E', w: true },
  // 06 receipt
  poLinesForGrn:      { fn: function (p) { return poLinesForGrn_(p); }, f: 'poLinesForGrn_', m: 'GRN', p: 'C' },
  postGrn:            { fn: function (p) { return postGrn_(p); }, f: 'postGrn_', m: 'GRN', p: 'C', w: true },
  createRtv:          { fn: function (p) { return createRtv_(p); }, f: 'createRtv_', m: 'GRN', p: 'C', w: true },
  updateRtvStatus:    { fn: function (p) { return updateRtvStatus_(p); }, f: 'updateRtvStatus_', m: 'GRN', p: 'E', w: true },
  // 07 inventory
  postOpening:        { fn: function (p) { return postOpening_(p); }, f: 'postOpening_', m: 'INVENTORY', p: 'C', w: true },
  dispatchTransfer:   { fn: function (p) { return dispatchTransfer_(p); }, f: 'dispatchTransfer_', m: 'INVENTORY', p: 'C', w: true },
  transferLines:      { fn: function (p) { return transferLinesForReceive_(p); }, f: 'transferLinesForReceive_', m: 'INVENTORY', p: 'E' },
  receiveTransfer:    { fn: function (p) { return receiveTransfer_(p); }, f: 'receiveTransfer_', m: 'INVENTORY', p: 'E', w: true },
  createAdjustment:   { fn: function (p) { return createAdjustment_(p); }, f: 'createAdjustment_', m: 'INVENTORY', p: 'C', w: true },
  // 08 site
  createMr:           { fn: function (p) { return createMr_(p); }, f: 'createMr_', m: 'SITE_REQUEST', p: 'C', w: true },
  mrLinesForIssue:    { fn: function (p) { return mrLinesForIssue_(p); }, f: 'mrLinesForIssue_', m: 'SITE_ISSUE_RETURN', p: 'C' },
  issueMaterial:      { fn: function (p) { return issueMaterial_(p); }, f: 'issueMaterial_', m: 'SITE_ISSUE_RETURN', p: 'C', w: true },
  acknowledgeIssue:   { fn: function (p) { return acknowledgeIssue_(p); }, f: 'acknowledgeIssue_', m: 'SITE_ISSUE_RETURN', p: 'C', w: true },
  issuedLines:        { fn: function (p) { return issuedLines_(p); }, f: 'issuedLines_', m: 'SITE_ISSUE_RETURN', p: 'C' },
  createReturn:       { fn: function (p) { return createReturn_(p); }, f: 'createReturn_', m: 'SITE_ISSUE_RETURN', p: 'C', w: true },
  reportWastage:      { fn: function (p) { return reportWastage_(p); }, f: 'reportWastage_', m: 'WASTAGE_USAGE', p: 'C', w: true },
  logUsage:           { fn: function (p) { return logUsage_(p); }, f: 'logUsage_', m: 'WASTAGE_USAGE', p: 'C', w: true },
  // 09 reports & closure
  rebuildReports:     { fn: function (p) { return rebuildReports_(p); }, f: 'rebuildReports_', m: 'REPORTS', p: 'V', w: true },
  prepareClosure:     { fn: function (p) { return prepareClosure_(p); }, f: 'prepareClosure_', m: 'CLOSURE', p: 'C', w: true },
  clearCache:         { fn: function (p) { return clearCache_(p); }, f: 'clearCache_', m: 'SETTINGS', p: 'E' },
  warm:               { fn: function (p) { return warmCache_(p); }, f: 'warmCache_' }
};

/** The single server entry point for the browser. Always returns {ok, data|error}. token = session token from login. */
function api(action, payload, token) {
  let lock = null;
  try {
    const a = ACTIONS[action];
    if (!a) throw new Error('Unknown action: ' + action);
    _DB.inApi = true; _DB.web = true;
    _DB.token = String(token || '');
    _DB.readOnly = !a.w;   // screens that only read are served from the shared cache
    const isPublic = PUBLIC_ACTIONS.indexOf(action) >= 0;
    if (!isPublic) {
      currentUser_();
      if (a.m) assertCan_(a.m, a.p);
      normalizeProducts_(payload || {});   // product chosen by NAME in the browser → PRODUCT_ID
    }
    if (a.w) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) throw new Error('System is busy, please try again in a few seconds.');
    }
    let res;
    try { res = a.fn(payload || {}); }
    catch (e) {
      if (e instanceof ReferenceError && String(e.message).indexOf(a.f) >= 0) resolveFn_(a.f); // throws a clear "file missing" message
      throw e;
    }
    flushAudit_();
    return { ok: true, data: serialize_(stripSecrets_(res)) };
  } catch (err) {
    _DB.audit = [];
    console.error(action, err && err.stack || err);
    return { ok: false, error: (err && err.message) || String(err) };
  } finally {
    try { flushCacheVersions_(); } catch (e) { }   // publish changes before other users read
    _DB.inApi = false; _DB.web = false; _DB.token = ''; _DB.user = null;
    if (lock) lock.releaseLock();
  }
}

/** Find a server function by name at call time; clear message if a file was not pasted. */
function resolveFn_(name) {
  const home = { Project: ['saveRecord_', 'syncLeads_', 'createStagePlan_', 'updateStage_', 'projectOverview_'],
    Bom: ['saveBom_', 'submitBom_', 'planBom_', 'releaseAllocation_'],
    Purchase: ['createPr_', 'addQuote_', 'selectQuote_', 'prLinesForPo_', 'createPo_', 'markPoSent_', 'cancelPo_', 'poLinesForGrn_', 'postGrn_', 'createRtv_', 'updateRtvStatus_'],
    Inventory: ['postOpening_', 'dispatchTransfer_', 'transferLinesForReceive_', 'receiveTransfer_', 'createAdjustment_'],
    Site: ['createMr_', 'mrLinesForIssue_', 'issueMaterial_', 'acknowledgeIssue_', 'issuedLines_', 'createReturn_', 'reportWastage_', 'logUsage_'],
    Reports: ['dashboard_', 'pendingApprovals_', 'approveDoc_', 'rebuildReports_', 'prepareClosure_'],
    Auth: ['login_', 'register_', 'registerOptions_', 'logout_', 'changePassword_', 'resetPassword_'],
    Support: ['syncSupport_'] };
  const file = Object.keys(home).find(function (k) { return home[k].indexOf(name) >= 0; }) || 'WebApp';
  throw new Error('Function ' + name + ' not found – the file "' + file + '" is missing or not fully pasted in the Apps Script editor.');
}

/* ---------------------------------------------------------------- bootstrap (one call on page load) */
function bootstrap_() {
  const u = currentUser_();
  const active = function (r) { return String(r.STATUS || 'ACTIVE').toUpperCase() === 'ACTIVE'; };
  const opt = function (rows, id, label) { return rows.filter(active).map(function (r) { return { v: r[id], l: r[id] + ' — ' + label(r) }; }); };
  const schema = {};
  Object.keys(SCHEMA).forEach(function (k) { schema[k] = { stage: SCHEMA[k].stage, module: SCHEMA[k].module, pk: SCHEMA[k].pk, cols: SCHEMA[k].cols }; });
  const products = cachedRows_('MST_PRODUCT').filter(active);
  return {
    app: APP_NAME, user: u, perms: u.ROLE === 'ADMIN' ? 'ALL' : permissions_(), schema: schema, lookups: lookups_(),
    config: { CURRENCY: cfg_('CURRENCY'), DEFAULT_WAREHOUSE_ID: cfg_('DEFAULT_WAREHOUSE_ID'), COMPANY_NAME: cfg_('COMPANY_NAME'),
      SUPPORT_URL: SUPPORT_SPREADSHEET_ID ? 'https://docs.google.com/spreadsheets/d/' + SUPPORT_SPREADSHEET_ID + '/edit' : '',
      SUPPORT_SYNCED_AT: PropertiesService.getScriptProperties().getProperty('SUPPORT_SYNCED_AT') || '' },
    stageFiles: STAGE_FILES,
    options: {
      MST_PRODUCT: products.map(function (r) { return { v: r.PRODUCT_ID, l: productLabel_(r), c: r.CATEGORY_ID }; }),
      MST_SUPPLIER: opt(cachedRows_('MST_SUPPLIER'), 'SUPPLIER_ID', function (r) { return r.SUPPLIER_NAME; }),
      MST_LOCATION: opt(cachedRows_('MST_LOCATION'), 'LOCATION_ID', function (r) { return r.LOCATION_NAME; }),
      MST_USER: opt(cachedRows_('MST_USER'), 'USER_ID', function (r) { return r.FULL_NAME + ' (' + r.ROLE + ')'; }),
      MST_CATEGORY: cachedRows_('MST_CATEGORY').filter(active).map(function (r) { return { v: r.CATEGORY_ID, l: r.CATEGORY_NAME }; }),
      MST_SUBCATEGORY: cachedRows_('MST_SUBCATEGORY').filter(active).map(function (r) { return { v: r.SUBCATEGORY_ID, l: r.SUBCATEGORY_NAME, p: r.CATEGORY_ID }; }),
      MST_UOM: opt(cachedRows_('MST_UOM'), 'UOM_CODE', function (r) { return r.UOM_NAME; }),
      MST_WORK_STAGE: opt(cachedRows_('MST_WORK_STAGE'), 'STAGE_CODE', function (r) { return r.STAGE_NAME; }),
      PRJ_PROJECT: rows_('PRJ_PROJECT').filter(function (p) { return ['COMPLETED', 'CANCELLED'].indexOf(p.PROJECT_STATUS) < 0; })
        .map(function (r) { return { v: r.PROJECT_ID, l: r.PROJECT_ID + ' — ' + r.PROJECT_NAME }; })
    }
  };
}

/** Dynamic options for document references. p: {ref} */
function refOptions_(p) {
  const f = {
    PUR_PO: function () { return rows_('PUR_PO').filter(function (r) { return ['APPROVED', 'SENT TO SUPPLIER', 'PARTIALLY RECEIVED'].indexOf(r.PO_STATUS) >= 0; }).map(function (r) { return { v: r.PO_ID, l: r.PO_ID + ' — ' + r.SUPPLIER_ID + ' (' + r.PO_STATUS + ')' }; }); },
    SITE_MR: function () { return rows_('SITE_MR').filter(function (r) { return ['APPROVED', 'PARTIALLY ISSUED'].indexOf(r.MR_STATUS) >= 0; }).map(function (r) { return { v: r.MR_ID, l: r.MR_ID + ' — ' + r.PROJECT_ID + ' / ' + r.STAGE_CODE }; }); },
    INV_TRANSFER: function () { return rows_('INV_TRANSFER').filter(function (r) { return r.TRANSFER_STATUS === 'IN TRANSIT'; }).map(function (r) { return { v: r.TRANSFER_ID, l: r.TRANSFER_ID + ' — ' + r.FROM_LOCATION_ID + ' → ' + r.TO_LOCATION_ID }; }); },
    BOM_HEADER: function () { return rows_('BOM_HEADER').map(function (r) { return { v: r.BOM_ID, l: r.BOM_ID + ' — ' + r.PROJECT_ID + ' v' + r.BOM_VERSION + ' (' + r.BOM_STATUS + ')' }; }); },
    PUR_PR_ITEMS: function () { return prLinesForPo_({}).map(function (r) { return { v: r.PR_ITEM_ID, l: r.PR_ITEM_ID + ' — ' + r.PRODUCT_ID + ' × ' + r.ORDERED_QTY }; }); },
    GRN_ITEMS: function () { return rows_('GRN_ITEMS').filter(function (r) { return num_(r.ACCEPTED_BASE_QTY) > 0; }).slice(-300).map(function (r) { return { v: r.GRN_ITEM_ID, l: r.GRN_ITEM_ID + ' — ' + r.PRODUCT_NAME + ' (' + r.GRN_ID + ')' }; }); },
    SITE_ISSUE_ITEMS: function () { return rows_('SITE_ISSUE_ITEMS').slice(-300).map(function (r) { return { v: r.ISSUE_ITEM_ID, l: r.ISSUE_ITEM_ID + ' — ' + r.PRODUCT_NAME + ' (' + r.PROJECT_ID + '/' + r.STAGE_CODE + ')' }; }); }
  }[p.ref];
  return f ? f() : [];
}

/* ---------------------------------------------------------------- generic list */
/** p: {sheet, filters:{COL: value}, search, limit, offset} -> {cols, rows, total}. Newest first. */
function apiList_(p) {
  const name = p.sheet, def = SCHEMA[name];
  if (!def) throw new Error('Unknown sheet ' + name);
  assertCan_(def.module, 'V');
  let rows = rows_(name);
  const f = p.filters || {};
  Object.keys(f).forEach(function (k) { if (!blank_(f[k])) rows = rows.filter(function (r) { return String(r[k]) === String(f[k]); }); });
  if (!blank_(p.search)) {
    const s = String(p.search).toLowerCase();
    rows = rows.filter(function (r) { return def.cols.some(function (c) { return String(fmtVal_(r[c.n])).toLowerCase().indexOf(s) >= 0; }); });
  }
  const total = rows.length, limit = Math.min(Number(p.limit) || LIST_LIMIT, 2000), offset = Number(p.offset) || 0;
  const page = rows.slice().reverse().slice(offset, offset + limit);
  return { cols: def.cols.map(function (c) { return c.n; }).filter(function (n) { return SECRET_COLS.indexOf(n) < 0; }), rows: page, total: total };
}

/* ---------------------------------------------------------------- document with lines */
const DOC_LINES = {
  BOM_HEADER: ['BOM_ITEMS', 'BOM_ID'], PUR_PR: ['PUR_PR_ITEMS', 'PR_ID'], PUR_PO: ['PUR_PO_ITEMS', 'PO_ID'], GRN_HEADER: ['GRN_ITEMS', 'GRN_ID'],
  INV_TRANSFER: ['INV_TRANSFER_ITEMS', 'TRANSFER_ID'], SITE_MR: ['SITE_MR_ITEMS', 'MR_ID'], SITE_ISSUE: ['SITE_ISSUE_ITEMS', 'ISSUE_ID'],
  SITE_RETURN: ['SITE_RETURN_ITEMS', 'RETURN_ID'], PRJ_PROJECT: ['PRJ_STAGE', 'PROJECT_ID']
};
/** p: {sheet, id} -> {header, lines, lineSheet} */
function getDoc_(p) {
  const def = SCHEMA[p.sheet];
  if (!def) throw new Error('Unknown sheet ' + p.sheet);
  assertCan_(def.module, 'V');
  const header = mustFind_(p.sheet, def.pk, p.id, p.sheet);
  const dl = DOC_LINES[p.sheet];
  const lines = dl ? rows_(dl[0]).filter(function (r) { return String(r[dl[1]]) === String(p.id); }) : [];
  const extra = {};
  if (p.sheet === 'PUR_PR') extra.quotes = rows_('PUR_QUOTATION').filter(function (q) { return q.PR_ID === p.id; });
  if (p.sheet === 'PRJ_PROJECT') extra.tracker = rows_('RPT_BOM_VS_ACTUAL').filter(function (r) { return r.PROJECT_ID === p.id; });
  return { header: header, lines: lines, lineSheet: dl ? dl[0] : '', extra: extra };
}

function clearCache_() {
  invalidateAll_();
  CacheService.getScriptCache().remove('WARMED');
  return { cleared: Object.keys(SCHEMA).length };
}

/**
 * Pre-loads every sheet into the shared cache so the first click on any module is instant.
 * Called quietly by the browser after page load (at most once per 5 minutes) and by the optional warm-up trigger.
 */
function warmCache_(p) {
  const c = CacheService.getScriptCache();
  if (!(p && p.force) && c.get('WARMED')) return { skipped: true };
  c.put('WARMED', '1', 300);
  const skip = ['INV_LEDGER', 'SYS_AUDIT_LOG', 'SYS_SEQUENCE'];   // large / write-only sheets
  let n = 0;
  Object.keys(SCHEMA).forEach(function (s) {
    if (skip.indexOf(s) >= 0) return;
    try { if (CACHEABLE.indexOf(s) >= 0) cachedRows_(s); else readThrough_(s, READ_TTL_); n++; } catch (e) { }
  });
  return { warmed: n };
}


/**
 * Run this from the editor (select checkFiles ▸ Run) if anything says "not found".
 * It lists every code file and whether its functions are visible to the project.
 */
function checkFiles() {
  const t = {
    Config: typeof DB_FILES !== 'undefined' && typeof fileId_ === 'function',
    Schema: typeof SCHEMA !== 'undefined' && typeof STAGE_FILES !== 'undefined',
    Seed: typeof SEED !== 'undefined',
    Db: typeof rows_ === 'function' && typeof insert_ === 'function',
    Auth: typeof currentUser_ === 'function' && typeof canApprove_ === 'function',
    Project: typeof saveRecord_ === 'function' && typeof syncLeads_ === 'function',
    Bom: typeof saveBom_ === 'function' && typeof planBom_ === 'function',
    Purchase: typeof createPo_ === 'function' && typeof postGrn_ === 'function',
    Inventory: typeof prepareLedger_ === 'function' && typeof commitLedger_ === 'function',
    Site: typeof issueMaterial_ === 'function' && typeof logUsage_ === 'function',
    Reports: typeof dashboard_ === 'function' && typeof pendingApprovals_ === 'function' && typeof rebuildReports_ === 'function',
    WebApp: typeof api === 'function',
    Setup: typeof setupVerifySchema === 'function' && typeof buildHeader_ === 'function',
    Support: typeof syncSupport_ === 'function' && typeof resolveProductId_ === 'function'
  };
  const html = {};
  ['Index', 'Styles', 'App'].forEach(function (f) { try { HtmlService.createHtmlOutputFromFile(f); html[f] = true; } catch (e) { html[f] = false; } });
  const lines = Object.keys(t).map(function (k) { return (t[k] ? '✔ ' : '✖ MISSING / INCOMPLETE  ') + k + '  (Script file)'; })
    .concat(Object.keys(html).map(function (k) { return (html[k] ? '✔ ' : '✖ MISSING  ') + k + '  (HTML file)'; }));
  Logger.log(lines.join('\n'));
  return lines;
}
