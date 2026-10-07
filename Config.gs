/**
 * ============================================================================
 *  Config.gs – the ONLY file you normally need to edit.
 * ============================================================================
 *  1. Upload the 10 IMS_xx_*.xlsx files to Drive and open each with Google Sheets
 *     (File > Save as Google Sheets). Paste each spreadsheet ID below.
 *     The ID is the long part of the URL: docs.google.com/spreadsheets/d/<ID>/edit
 *     – OR – leave them blank and run setupCreateDatabase() once; the script creates
 *     all 10 files with headers + seed data and remembers their IDs.
 *  2. Put your own Google email in SUPER_ADMINS so you can log in before MST_USER is filled.
 *  3. Map your lead-closure sheet headers in LEAD_FIELD_MAP.
 * ============================================================================
 */
const APP_NAME = 'Inventory Management System';

const DB_FILES = {
  '00': '15qp0u26zMNYwa3NcfYlLOi0wRiX1A43bRhidA4hMAr4', // IMS_00_SYSTEM
  '01': '1HWSG4UohWm5vi4C27rzO0AaoFXzybNDmL01E_Gu39JU', // IMS_01_MASTERS
  '02': '1XbRmWhVTI1jppZ70IhHfOFqvDozMqmd9NVEl0rAHJ80', // IMS_02_PROJECT
  '03': '1Opm3x7wWQlJAZFYUg3Tr5YsQq1GmqAnQeA_iJpWtHi8', // IMS_03_BOM
  '04': '19M-mmS7u97cfdy8yL4MVHKM7w5gg_gO-QUTMIxDe1EQ', // IMS_04_ALLOCATION
  '05': '1v2c0-4u3pY7k8qPJbS8c958O8QXx9GBAaaJGAd0yvJQ', // IMS_05_PROCUREMENT
  '06': '1uGDCyuOBO3ca0eE6gkG3QiwMxCwRtYosT7IAPZqmM_Y', // IMS_06_RECEIPT
  '07': '1ZMfhw2u-Xfl_0HHhvRWNW23DI2gopXpr3A4ZiNmMohE', // IMS_07_INVENTORY
  '08': '1fuVQLr9vELN0jXlqNU1OTaC9U8DQ4luQZDp3tbelnQ0', // IMS_08_SITE
  '09': '1t4Oy2bttmvyFNV9WlujhWdaLmwwDE3zRHalIqIqAYwE'  // IMS_09_CLOSURE_REPORTS
};

/**
 * LOGIN: these emails become ADMIN automatically when they REGISTER on the login page (lower-case).
 * Register with this email first, right after deploying. Everyone else is approved by an admin.
 */
const SUPER_ADMINS = ['mos@ravishvohrahome.in']; // <-- CHANGE THIS (lower-case)

/* ============================================================================
 *  ▼▼▼  SUPPORT SHEET – the single source of every dropdown (categories, sub-categories, units, brands …)  ▼▼▼
 * ============================================================================ */
const SUPPORT_SPREADSHEET_ID = '1B1tgy-5lO7Hkl_ud_NBmi33X5I5zGqhWKkIo2yknajc';  // ← ID from the Support sheet URL
const SUPPORT_SHEET_TAB      = 'Support';                                       // ← tab name
/* ▲▲▲ ======================================================================== ▲▲▲ */

/* ============================================================================
 *  ▼▼▼  LEAD / PROJECT-CLOSURE SHEET  – fill these 3 lines, then run step5_ConnectLeadSheet  ▼▼▼
 * ============================================================================ */
const LEAD_SPREADSHEET_ID = '1N99y0-zZ8GZ74AxmuWXHduABHlVe51Y7h0lwp981lW0';  // ← ID from the lead sheet URL
const LEAD_SHEET_TAB      = 'Sheet22';                                        // ← exact tab name (bottom of the sheet)
const LEAD_SYNC_STATUS    = 'CLOSED WON';  // ← status text meaning "closed" in your status column ('' = take every row)
/* ▲▲▲ ======================================================================== ▲▲▲ */

/**
 * Lead-closure sheet header (UPPER CASE, exactly as in your lead sheet)  ->  PRJ_PROJECT column.
 * '_LEAD_STATUS' is used only to filter rows by SYS_CONFIG.LEAD_SYNC_STATUS.
 * Spreadsheet ID and tab name come from SYS_CONFIG (LEAD_SPREADSHEET_ID, LEAD_SHEET_TAB).
 */
const LEAD_FIELD_MAP = {
  'PROJECT ID': 'PROJECT_ID',
  'LEAD ID': 'LEAD_ID',
  'PROJECT NAME': 'PROJECT_NAME',
  'CLIENT NAME': 'CLIENT_NAME',
  'CLIENT PHONE': 'CLIENT_PHONE',
  'PROJECT TYPE': 'PROJECT_TYPE',
  'SITE ADDRESS': 'SITE_ADDRESS',
  'CITY': 'CITY',
  'CLOSURE DATE': 'CLOSURE_DATE',
  'CONTRACT VALUE': 'CONTRACT_VALUE',
  'PROJECT STATUS': '_LEAD_STATUS'
};

/** Background colour of sample rows in the delivered xlsx files (used by setupClearSampleRows). */
const SAMPLE_ROW_COLOR = '#fff59d';

/** Masters / settings cached in CacheService (6 h). Busted automatically when edited through the app. */
const CACHEABLE = ['SYS_CONFIG', 'SYS_LOOKUP', 'SYS_APPROVAL_MATRIX', 'MST_ROLE_PERMISSION', 'MST_USER', 'MST_LOCATION',
  'MST_CATEGORY', 'MST_SUBCATEGORY', 'MST_UOM', 'MST_WORK_STAGE', 'MST_PRODUCT', 'MST_SUPPLIER', 'MST_SUPPLIER_PRICE'];
const CACHE_SECONDS = 21600;

/** Sheets that can be created / edited through the generic record form. Others only via their workflow. */
const GENERIC_EDITABLE = ['SYS_CONFIG', 'SYS_LOOKUP', 'SYS_APPROVAL_MATRIX', 'MST_USER', 'MST_ROLE_PERMISSION', 'MST_LOCATION',
  'MST_CATEGORY', 'MST_SUBCATEGORY', 'MST_UOM', 'MST_WORK_STAGE', 'MST_PRODUCT', 'MST_SUPPLIER', 'MST_SUPPLIER_PRICE',
  'PRJ_PROJECT', 'PRJ_STAGE'];

/** Max rows returned to the browser by a list call. */
const LIST_LIMIT = 500;

/** Spreadsheet ID for a stage: Config.gs first, then Script Properties (set by setupCreateDatabase). */
function fileId_(stage) {
  return DB_FILES[stage] || PropertiesService.getScriptProperties().getProperty('DB_' + stage) || '';
}

/* ============================================================================
 *  SETUP HELPERS – run these from the editor in order (select function ▸ Run)
 * ============================================================================ */

/** STEP A: checks that all 10 files open and every tab exists. Changes nothing. */
function step1_CheckConnection() {
  const out = [];
  if (typeof SCHEMA === 'undefined') throw new Error('Schema.gs is missing or empty – paste it first.');
  if (typeof SEED === 'undefined') throw new Error('Seed.gs is missing or empty – paste it first.');
  if (SUPER_ADMINS[0].indexOf('PUT-YOUR') === 0) out.push('⚠ SUPER_ADMINS still has the placeholder – put your email in Config.gs');
  out.push('Script is running as: ' + Session.getEffectiveUser().getEmail());
  Object.keys(STAGE_FILES).forEach(function (st) {
    const id = fileId_(st);
    let ss;
    try { ss = SpreadsheetApp.openById(id); }
    catch (e) { out.push('✖ ' + st + ' ' + STAGE_FILES[st] + ' – cannot open (' + e.message + ')'); return; }
    const want = Object.keys(SCHEMA).filter(function (n) { return SCHEMA[n].stage === st; });
    const missing = want.filter(function (n) { return !ss.getSheetByName(n); });
    const empty = want.filter(function (n) { const s = ss.getSheetByName(n); return s && s.getLastRow() < 1; });
    out.push((missing.length || empty.length ? '⚠ ' : '✔ ') + st + ' ' + ss.getName() +
      (missing.length ? ' | missing tabs: ' + missing.join(', ') : '') + (empty.length ? ' | tabs without header: ' + empty.join(', ') : ''));
  });
  Logger.log(out.join('\n'));
  return out;
}

/** STEP B: creates missing tabs / header columns and loads starter data into empty setting/master tabs. Safe to run again. */
function step2_FixTabsAndSeed() {
  Object.keys(SCHEMA).forEach(function (n) {
    const ss = ss_(SCHEMA[n].stage);
    const s = ss.getSheetByName(n);
    if (s && s.getLastRow() < 1) buildHeader_(s, n);
  });
  setupVerifySchema();
  _DB.sh = {}; _DB.hdr = {}; _DB.data = {};
  const seeded = [];
  Object.keys(SEED).forEach(function (n) {
    const s = sh_(n);
    if (s.getLastRow() > 1) return;
    const h = hdr_(n).list, defs = colDefs_(n);
    const vals = SEED[n].map(function (o) { return h.map(function (k) { return coerce_(defs[k] ? defs[k].t : 'TEXT', o[k]); }); });
    if (vals.length) { s.getRange(2, 1, vals.length, h.length).setValues(vals); seeded.push(n + ' (' + vals.length + ')'); }
  });
  // remove the default "Sheet1" tabs that Google adds to new files
  Object.keys(STAGE_FILES).forEach(function (st) {
    const ss = ss_(st), s1 = ss.getSheetByName('Sheet1');
    if (s1 && ss.getSheets().length > 1 && s1.getLastRow() === 0) ss.deleteSheet(s1);
  });
  CACHEABLE.forEach(invalidateCache_);
  Logger.log('Tabs OK. Seeded: ' + (seeded.join(', ') || 'nothing (already had data)'));
}

/** STEP C (only before go-live): delete yellow sample rows + reset ID counters. */
function step3_ClearSampleData() { setupClearSampleRows(); }

/** STEP D: hourly lead sync + nightly report rebuild. */
function step4_InstallTriggers() { setupTriggers(); }

/**
 * STEP E: connects the lead sheet.
 *  - saves LEAD_SPREADSHEET_ID / LEAD_SHEET_TAB / LEAD_SYNC_STATUS (above) into SYS_CONFIG
 *  - opens the lead sheet and reports which of its columns match LEAD_FIELD_MAP
 *  - shows the status values found, so you can see how many rows will be synced
 * Changes nothing in the lead sheet. Safe to run again.
 */
function step5_ConnectLeadSheet() {
  const out = [];
  const ss = SpreadsheetApp.openById(LEAD_SPREADSHEET_ID);            // fails here if ID is wrong or not shared
  const sh = ss.getSheetByName(LEAD_SHEET_TAB);
  if (!sh) throw new Error('Tab "' + LEAD_SHEET_TAB + '" not found. Tabs in this file: ' + ss.getSheets().map(function (x) { return x.getName(); }).join(', '));
  const v = sh.getDataRange().getValues();
  const head = (v.shift() || []).map(function (x) { return String(x).trim().toUpperCase(); });
  out.push('Lead file: ' + ss.getName() + '  |  tab: ' + LEAD_SHEET_TAB + '  |  data rows: ' + v.length);
  out.push('Headers found: ' + head.filter(String).join(' | '));
  const matched = Object.keys(LEAD_FIELD_MAP).filter(function (k) { return head.indexOf(k) >= 0; });
  const unmatched = Object.keys(LEAD_FIELD_MAP).filter(function (k) { return head.indexOf(k) < 0; });
  out.push('✔ Matched: ' + (matched.map(function (k) { return k + ' → ' + LEAD_FIELD_MAP[k]; }).join(', ') || 'none'));
  if (unmatched.length) out.push('… Not in your sheet (ignored): ' + unmatched.join(', '));

  let status = String(LEAD_SYNC_STATUS || '').trim();
  const idKey = Object.keys(LEAD_FIELD_MAP).find(function (k) { return LEAD_FIELD_MAP[k] === 'PROJECT_ID'; });
  const stKey = Object.keys(LEAD_FIELD_MAP).find(function (k) { return LEAD_FIELD_MAP[k] === '_LEAD_STATUS'; });
  if (!idKey || head.indexOf(idKey) < 0)
    out.push('✖ PROJECT ID column not found. In LEAD_FIELD_MAP change the left side of the PROJECT_ID line to your project-id header (one of the headers above).');
  if (status && (!stKey || head.indexOf(stKey) < 0)) {
    out.push('⚠ Status column "' + stKey + '" not in your sheet → LEAD_SYNC_STATUS saved as blank, so every row with a project id will sync.');
    status = '';
  }
  let willSync = 0;
  if (idKey && head.indexOf(idKey) >= 0) {
    const ii = head.indexOf(idKey), si = stKey ? head.indexOf(stKey) : -1, counts = {};
    v.forEach(function (r) {
      if (String(r[ii]).trim() === '') return;
      const st = si >= 0 ? String(r[si]).trim().toUpperCase() : '';
      counts[st || '(blank)'] = (counts[st || '(blank)'] || 0) + 1;
      if (!status || st === status.toUpperCase()) willSync++;
    });
    if (si >= 0) out.push('Status values in your sheet: ' + Object.keys(counts).map(function (k) { return k + ' = ' + counts[k]; }).join(', '));
    out.push((willSync ? '✔ ' : '⚠ ') + willSync + ' row(s) will be synced' + (status ? ' (status = ' + status + ')' : ' (all rows with a project id)'));
  }

  // save into SYS_CONFIG
  const vals = { LEAD_SPREADSHEET_ID: LEAD_SPREADSHEET_ID, LEAD_SHEET_TAB: LEAD_SHEET_TAB, LEAD_SYNC_STATUS: status };
  Object.keys(vals).forEach(function (k) {
    const r = rows_('SYS_CONFIG').find(function (x) { return x.CONFIG_KEY === k; });
    if (r) update_('SYS_CONFIG', r, { CONFIG_VALUE: vals[k], STATUS: 'ACTIVE' }, false);
    else insert_('SYS_CONFIG', [{ CONFIG_KEY: k, CONFIG_VALUE: vals[k], DESCRIPTION: 'Lead sync setting', STATUS: 'ACTIVE' }]);
  });
  invalidateCache_('SYS_CONFIG');
  out.push('✔ Saved to SYS_CONFIG. Now open the web app → Projects → ⟳ Sync closed leads.');
  Logger.log(out.join('\n'));
  return out;
}

/** STEP F: builds the Support tab (only if it is empty) with all current dropdown values, then syncs it. */
function step6_CreateSupportSheet() {
  const r = createSupportSheet_();
  Logger.log(r.created ? 'Support tab created: ' + r.columns + ' columns, ' + r.rows + ' rows.' : r.message);
  step7_SyncSupport();
}

/** STEP G: reads the Support tab now and updates every dropdown (also runs automatically every 15 min). */
function step7_SyncSupport() {
  _DB.inApi = true;
  try { Logger.log(syncSupport_({ force: true }).message); flushAudit_(); }
  finally { flushCacheVersions_(); _DB.inApi = false; }
}
