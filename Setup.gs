/**
 * ============================================================================
 *  Setup.gs – run these from the Apps Script editor (Run ▶), not from the web app.
 *    setupCreateDatabase()   creates any missing stage file (headers + seed data) and remembers its ID
 *    setupVerifySchema()     checks every stage file: adds missing tabs / missing columns at the end
 *    setupClearSampleRows()  deletes the yellow sample rows from the delivered xlsx files + resyncs ID counters
 *    setupTriggers()         hourly lead sync + nightly report rebuild
 *    setupShowFiles()        logs the URL of every stage file
 * ============================================================================
 */
function setupCreateDatabase() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(STAGE_FILES).forEach(function (stage) {
    if (fileId_(stage)) { Logger.log('Stage ' + stage + ' already configured: ' + fileId_(stage)); return; }
    const ss = SpreadsheetApp.create(STAGE_FILES[stage]);
    const names = Object.keys(SCHEMA).filter(function (n) { return SCHEMA[n].stage === stage; });
    names.forEach(function (n, i) {
      const sh = i === 0 ? ss.getSheets()[0].setName(n) : ss.insertSheet(n);
      buildHeader_(sh, n);
    });
    props.setProperty('DB_' + stage, ss.getId());
    _DB.ss[stage] = ss;
    Logger.log('Created ' + STAGE_FILES[stage] + ' → ' + ss.getUrl());
  });
  // seed data (only into empty sheets)
  Object.keys(SEED).forEach(function (n) {
    const s = sh_(n);
    if (s.getLastRow() > 1) return;
    const h = hdr_(n).list, defs = colDefs_(n);
    const vals = SEED[n].map(function (o) { return h.map(function (k) { return coerce_(defs[k] ? defs[k].t : 'TEXT', o[k]); }); });
    if (vals.length) s.getRange(2, 1, vals.length, h.length).setValues(vals);
  });
  Logger.log('Database ready. Next: put your email in SUPER_ADMINS, run setupTriggers(), then Deploy > New deployment > Web app.');
}

function buildHeader_(sh, name) {
  const cols = SCHEMA[name].cols;
  sh.getRange(1, 1, 1, cols.length).setValues([cols.map(function (c) { return c.n; })])
    .setFontWeight('bold').setFontColor('#ffffff').setBackground('#37474f').setWrap(true);
  sh.getRange(1, 1, 1, cols.length).setNotes([cols.map(function (c) { return (c.d || c.n) + '\nType: ' + c.t + (c.ref ? '\nRef: ' + c.ref : '') + '\nBy: ' + c.by; })]);
  sh.setFrozenRows(1);
  try { invalidateCache_(name); } catch (e) { }
  const extra = sh.getMaxColumns() - cols.length;
  if (extra > 0) sh.deleteColumns(cols.length + 1, extra);
  if (sh.getMaxRows() > 200) sh.deleteRows(201, sh.getMaxRows() - 200);
}

function setupVerifySchema() {
  const report = [];
  Object.keys(SCHEMA).forEach(function (n) {
    const ss = ss_(SCHEMA[n].stage);
    let sh = ss.getSheetByName(n);
    if (!sh) { sh = ss.insertSheet(n); buildHeader_(sh, n); report.push('Created tab ' + n); return; }
    const lc = Math.max(sh.getLastColumn(), 1);
    const have = sh.getRange(1, 1, 1, lc).getValues()[0].map(function (x) { return String(x).trim(); });
    const missing = SCHEMA[n].cols.map(function (c) { return c.n; }).filter(function (c) { return have.indexOf(c) < 0; });
    if (missing.length) {
      if (sh.getMaxColumns() < lc + missing.length) sh.insertColumnsAfter(sh.getMaxColumns(), lc + missing.length - sh.getMaxColumns());
      sh.getRange(1, lc + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
      report.push(n + ': added ' + missing.join(', '));
    }
  });
  _DB.hdr = {}; _DB.data = {};
  try { invalidateAll_(); } catch (e) { }
  Logger.log(report.length ? report.join('\n') : 'Schema OK – all tabs and columns present.');
  return report;
}

/** Deletes rows whose first cell has the sample background colour, in every stage file, then resyncs ID counters. */
function setupClearSampleRows() {
  let total = 0;
  Object.keys(SCHEMA).forEach(function (n) {
    const sh = sh_(n), lr = sh.getLastRow();
    if (lr < 2) return;
    const bg = sh.getRange(2, 1, lr - 1, 1).getBackgrounds();
    const rows = [];
    bg.forEach(function (b, i) { if (String(b[0]).toLowerCase() === SAMPLE_ROW_COLOR) rows.push({ _row: i + 2 }); });
    if (rows.length) { deleteRows_(n, rows); total += rows.length; }
  });
  resyncSequences_();
  CACHEABLE.forEach(invalidateCache_);
  Logger.log('Deleted ' + total + ' sample rows and resynced SYS_SEQUENCE.');
}

/** Set LAST_NUMBER of every sequence to the highest number actually used in its sheet. */
function resyncSequences_() {
  const fy = String(cfg_('CURRENT_FY') || '');
  Object.keys(SCHEMA).forEach(function (n) {
    const ent = SCHEMA[n].entity;
    if (!ent) return;
    const seq = rows_('SYS_SEQUENCE').find(function (r) { return r.ENTITY === ent; });
    if (!seq) return;
    const useFy = String(seq.USE_FY).toUpperCase() === 'Y';
    const prefix = seq.PREFIX + '-' + (useFy ? fy + '-' : '');
    let max = 0;
    rows_(n).forEach(function (r) {
      const id = String(r[SCHEMA[n].pk] || '');
      if (id.indexOf(prefix) === 0) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
    });
    update_('SYS_SEQUENCE', seq, { LAST_NUMBER: max, LAST_FY: useFy ? fy : '' }, false);
  });
}

function setupShowFiles() {
  Object.keys(STAGE_FILES).forEach(function (s) {
    const id = fileId_(s);
    Logger.log(s + ' ' + STAGE_FILES[s] + ': ' + (id ? 'https://docs.google.com/spreadsheets/d/' + id + '/edit' : 'NOT CONFIGURED'));
  });
}

/* ---------------------------------------------------------------- triggers */
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['triggerSyncLeads', 'triggerNightly', 'triggerSyncSupport'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('triggerSyncLeads').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('triggerNightly').timeBased().everyDays(1).atHour(1).create();
  ScriptApp.newTrigger('triggerSyncSupport').timeBased().everyMinutes(15).create();
  Logger.log('Triggers installed: lead sync hourly, Support sheet sync every 15 min, report rebuild daily at 01:00.');
}

function triggerSyncLeads() { runLocked_(function () { Logger.log(JSON.stringify(syncLeads_())); }); }

function triggerSyncSupport() { runLocked_(function () { Logger.log(JSON.stringify(syncSupport_({}))); }); }

function triggerNightly() { runLocked_(function () { Logger.log(JSON.stringify(rebuildReports_())); }); }

function runLocked_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) { Logger.log('Busy – skipped'); return; }
  _DB.inApi = true;
  try { fn(); flushAudit_(); } finally { try { flushCacheVersions_(); } catch (e) { } _DB.inApi = false; lock.releaseLock(); }
}

/* ---------------------------------------------------------------- optional: keep the cache warm */
/** Optional. Reloads the read cache every 10 minutes so even the first click of the day is fast. */
function setupWarmTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'triggerWarmCache') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('triggerWarmCache').timeBased().everyMinutes(10).create();
  Logger.log('Warm-up trigger installed (every 10 minutes).');
}
function triggerWarmCache() { _DB.readOnly = true; Logger.log(JSON.stringify(warmCache_({ force: true }))); }
