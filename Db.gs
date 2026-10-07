/**
 * ============================================================================
 *  Db.gs – data-access layer over the 10 stage spreadsheets.
 *  - Opens a stage file only when a sheet in it is touched (per-execution memo).
 *  - Maps columns by HEADER NAME, never by letter.
 *  - Reads a sheet once per execution (getValues) and keeps it in memory.
 *  - Writes in batches (setValues). Every write keeps the in-memory copy in sync.
 * ============================================================================
 */
const _DB = { ss: {}, sh: {}, hdr: {}, data: {}, cached: {}, audit: [], user: null, dirty: {}, last: {}, readOnly: false, inApi: false };

/* Speed settings (defaults – can be overridden by defining the same const in Config.gs) */
const READ_TTL_ = (typeof READ_CACHE_SECONDS !== 'undefined') ? READ_CACHE_SECONDS : 900; // transaction sheets: 15 min
const CHUNK_CHARS_ = 30000;  // < 100 KB per cache value even with multi-byte characters
const MAX_CHUNKS_ = 40;      // sheets bigger than ~1.2 MB of JSON are read live (not cached)

/* ---------------------------------------------------------------- handles */
function ss_(stage) {
  if (!_DB.ss[stage]) {
    const id = fileId_(stage);
    if (!id) throw new Error('Spreadsheet for stage ' + stage + ' (' + STAGE_FILES[stage] + ') is not configured. Fill DB_FILES in Config.gs or run setupCreateDatabase().');
    _DB.ss[stage] = SpreadsheetApp.openById(id);
  }
  return _DB.ss[stage];
}

function sh_(name) {
  if (!_DB.sh[name]) {
    const def = SCHEMA[name];
    if (!def) throw new Error('Unknown sheet ' + name);
    const s = ss_(def.stage).getSheetByName(name);
    if (!s) throw new Error('Sheet ' + name + ' not found in ' + STAGE_FILES[def.stage] + '. Run setupVerifySchema().');
    _DB.sh[name] = s;
  }
  return _DB.sh[name];
}

function hdr_(name) {
  if (!_DB.hdr[name]) {
    const s = sh_(name);
    const lc = Math.max(s.getLastColumn(), 1);
    const list = s.getRange(1, 1, 1, lc).getValues()[0].map(function (x) { return String(x).trim(); });
    while (list.length && !list[list.length - 1]) list.pop();
    const map = {};
    list.forEach(function (h, i) { if (h) map[h] = i; });
    _DB.hdr[name] = { list: list, map: map };
  }
  return _DB.hdr[name];
}

/** Column definition map {COL: def} for a sheet. */
function colDefs_(name) {
  const def = SCHEMA[name];
  if (!def._map) { def._map = {}; def.cols.forEach(function (c) { def._map[c.n] = c; }); }
  return def._map;
}

/* ---------------------------------------------------------------- reads */
/**
 * All data rows as objects {_row, COL: value}.
 * In read-only API calls (opening screens) the rows come from the shared read cache, so no spreadsheet is opened.
 * In write calls they are always read live from the sheet.
 */
function rows_(name) {
  if (_DB.readOnly && !_DB.dirty[name]) return readThrough_(name, CACHEABLE.indexOf(name) >= 0 ? CACHE_SECONDS : READ_TTL_);
  return liveRows_(name);
}

/** Live read: header + data in ONE spreadsheet call (getDataRange), memoised for this execution. */
function liveRows_(name) {
  if (!_DB.data[name]) {
    const all = sh_(name).getDataRange().getValues();
    if (!_DB.hdr[name]) {
      const list = (all[0] || []).map(function (x) { return String(x).trim(); });
      while (list.length && !list[list.length - 1]) list.pop();
      const map = {};
      list.forEach(function (h, i) { if (h) map[h] = i; });
      _DB.hdr[name] = { list: list, map: map };
    }
    const h = _DB.hdr[name].list, out = [];
    for (let i = 1; i < all.length; i++) {
      const r = all[i];
      let blank = true;
      for (let j = 0; j < h.length; j++) { if (r[j] !== '' && r[j] !== null && r[j] !== undefined) { blank = false; break; } }
      if (blank) continue;
      const o = { _row: i + 1 };
      for (let j = 0; j < h.length; j++) if (h[j]) o[h[j]] = r[j] === undefined ? '' : r[j];
      out.push(o);
    }
    _DB.last[name] = all.length;
    _DB.data[name] = out;
  }
  return _DB.data[name];
}

/** Masters / settings (6 h cache). Read-only use. */
function cachedRows_(name) {
  if (CACHEABLE.indexOf(name) < 0) return rows_(name);
  return readThrough_(name, CACHE_SECONDS);
}

/**
 * Shared read cache (CacheService), version-stamped per sheet:
 *   V:<sheet>            current version token – changed by every write through the app
 *   T:<sheet>:<ver>      number of chunks, T:<sheet>:<ver>:<i> = JSON chunk
 * A write never has to delete data; it just moves the version, so a reader can never pick up old rows.
 */
function readThrough_(name, ttl) {
  if (_DB.cached[name]) return _DB.cached[name];
  if (_DB.dirty[name]) return liveRows_(name);
  const c = CacheService.getScriptCache();
  let ver = c.get('V:' + name);
  if (!ver) { ver = newToken_(); c.put('V:' + name, ver, 21600); }
  const base = 'T:' + name + ':' + ver;
  const meta = c.get(base);
  if (meta) {
    const n = Number(meta), keys = [];
    for (let i = 0; i < n; i++) keys.push(base + ':' + i);
    const parts = c.getAll(keys);
    let s = '';
    for (let i = 0; i < n; i++) { const p = parts[keys[i]]; if (p == null) { s = null; break; } s += p; }
    if (s) { try { _DB.cached[name] = JSON.parse(s); return _DB.cached[name]; } catch (e) { /* corrupt chunk – read live */ } }
  }
  const rows = liveRows_(name);
  try {
    const s = JSON.stringify(serialize_(rows)), obj = {};
    let n = 0;
    for (let i = 0; i < s.length; i += CHUNK_CHARS_) obj[base + ':' + (n++)] = s.slice(i, i + CHUNK_CHARS_);
    if (n <= MAX_CHUNKS_) { obj[base] = String(n); c.putAll(obj, ttl); }
  } catch (e) { /* too big for cache – just use live rows */ }
  _DB.cached[name] = rows;
  return rows;
}

function newToken_() { return Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36); }

/** Mark a sheet as changed. Inside api() the new versions are published once at the end (flushCacheVersions_). */
function invalidateCache_(name) {
  delete _DB.cached[name];
  if (name === 'MST_PRODUCT') { _DB.pm = null; _DB.pnames = null; }
  if (name === 'MST_UOM') _DB.um = null;
  if (name === 'SYS_CONFIG') _DB.cfg = null;
  _DB.dirty[name] = 1;
  if (!_DB.inApi) flushCacheVersions_();
}

/** Publish new version tokens for every sheet changed in this execution (one CacheService call). */
function flushCacheVersions_() {
  const names = Object.keys(_DB.dirty);
  if (!names.length) return;
  const obj = {}, tok = newToken_();
  names.forEach(function (n) { obj['V:' + n] = tok + n.length; });
  try { CacheService.getScriptCache().putAll(obj, 21600); } catch (e) { }
  _DB.dirty = {};
}

/** Invalidate every sheet (Settings → Clear cache). */
function invalidateAll_() {
  Object.keys(SCHEMA).forEach(function (n) { delete _DB.cached[n]; _DB.dirty[n] = 1; });
  flushCacheVersions_();
}

function findOne_(name, col, val) {
  return rows_(name).find(function (r) { return String(r[col]) === String(val); }) || null;
}
function mustFind_(name, col, val, label) {
  const r = findOne_(name, col, val);
  if (!r) throw new Error((label || name) + ' ' + val + ' not found');
  return r;
}
function indexBy_(rows, col) {
  const m = {};
  rows.forEach(function (r) { m[r[col]] = r; });
  return m;
}

/* ---------------------------------------------------------------- writes */
function coerce_(t, v) {
  if (v === undefined || v === null) return '';
  if (v === '') return '';
  if (t === 'DATE' || t === 'DATETIME') { if (v instanceof Date) return v; const d = parseDate_(v); return d || v; }
  if (t === 'NUMBER' || t === 'CURRENCY' || t === 'PCT') { const n = Number(v); return isNaN(n) ? v : n; }
  if (t === 'Y/N') return (v === true || String(v).toUpperCase() === 'Y') ? 'Y' : 'N';
  return v;
}

/** Append objects to a sheet in one setValues call. Fills audit columns. Returns the objects. */
function insert_(name, objs) {
  if (!objs || !objs.length) return [];
  const h = hdr_(name).list, defs = colDefs_(name), s = sh_(name);
  const now = new Date(), email = currentEmail_();
  const values = objs.map(function (o) {
    if (h.indexOf('CREATED_AT') >= 0 && !o.CREATED_AT) o.CREATED_AT = now;
    if (h.indexOf('CREATED_BY') >= 0 && !o.CREATED_BY) o.CREATED_BY = email;
    return h.map(function (k) { return coerce_(defs[k] ? defs[k].t : 'TEXT', o[k]); });
  });
  const start = (_DB.last[name] !== undefined ? _DB.last[name] : s.getLastRow()) + 1;
  s.getRange(start, 1, values.length, h.length).setValues(values);
  _DB.last[name] = start + values.length - 1;
  if (_DB.data[name]) {
    values.forEach(function (v, i) {
      const r = { _row: start + i };
      h.forEach(function (k, j) { if (k) r[k] = v[j]; });
      _DB.data[name].push(r);
    });
  }
  invalidateCache_(name);
  return objs;
}

/**
 * Update one row object (from rows_) with a patch. Writes the whole row once, only if something changed.
 * audit=true (default) logs every changed field to SYS_AUDIT_LOG.
 */
function update_(name, rowObj, patch, audit) {
  const h = hdr_(name).list, defs = colDefs_(name);
  const changed = [];
  Object.keys(patch).forEach(function (k) {
    if (h.indexOf(k) < 0 || k === '_row') return;
    const nv = coerce_(defs[k] ? defs[k].t : 'TEXT', patch[k]);
    if (!sameVal_(rowObj[k], nv)) { changed.push([k, rowObj[k], nv]); rowObj[k] = nv; }
  });
  if (!changed.length) return rowObj;
  if (h.indexOf('UPDATED_AT') >= 0) { rowObj.UPDATED_AT = new Date(); rowObj.UPDATED_BY = currentEmail_(); }
  const values = [h.map(function (k) { return k ? (rowObj[k] === undefined ? '' : rowObj[k]) : ''; })];
  sh_(name).getRange(rowObj._row, 1, 1, h.length).setValues(values);
  invalidateCache_(name);
  if (audit !== false) {
    const pk = SCHEMA[name].pk;
    changed.forEach(function (c) { logAudit_('UPDATE', name, pk ? rowObj[pk] : rowObj._row, c[0], c[1], c[2]); });
  }
  return rowObj;
}

function sameVal_(a, b) {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Date || b instanceof Date) return false;
  if (typeof a === 'number' || typeof b === 'number') {
    if (a === '' || b === '' || a === undefined || b === undefined) return a === b;
    return Number(a) === Number(b);
  }
  return String(a === undefined || a === null ? '' : a) === String(b === undefined || b === null ? '' : b);
}

/** Delete row objects (grouped into contiguous blocks, bottom-up). Resets the memo. */
function deleteRows_(name, rowObjs) {
  if (!rowObjs.length) return;
  const nums = rowObjs.map(function (r) { return r._row; }).sort(function (a, b) { return b - a; });
  const s = sh_(name);
  let i = 0;
  while (i < nums.length) {
    let end = nums[i], start = end, j = i + 1;
    while (j < nums.length && nums[j] === start - 1) { start = nums[j]; j++; }
    s.deleteRows(start, end - start + 1);
    i = j;
  }
  delete _DB.data[name];
  delete _DB.last[name];
  invalidateCache_(name);
}

/** Replace all data rows of a (report) sheet in one write. */
function writeTable_(name, objs) {
  const s = sh_(name), h = hdr_(name).list, defs = colDefs_(name), lr = s.getLastRow();
  if (lr > 1) s.getRange(2, 1, lr - 1, h.length).clearContent();
  if (objs.length) {
    const values = objs.map(function (o) { return h.map(function (k) { return coerce_(defs[k] ? defs[k].t : 'TEXT', o[k]); }); });
    s.getRange(2, 1, values.length, h.length).setValues(values);
  }
  delete _DB.data[name];
  delete _DB.last[name];
  invalidateCache_(name);
}

/** Write several columns for many rows of a sheet in one setValues per column. updates: [{row, patch}] */
function writeColumns_(name, cols, updates) {
  if (!updates.length) return;
  const s = sh_(name), map = hdr_(name).map, lr = s.getLastRow();
  cols.forEach(function (col) {
    const ci = map[col];
    if (ci === undefined || lr < 2) return;
    const rng = s.getRange(2, ci + 1, lr - 1, 1), vals = rng.getValues();
    updates.forEach(function (u) { if (col in u.patch) vals[u.row - 2][0] = u.patch[col]; });
    rng.setValues(vals);
  });
  delete _DB.data[name];
  invalidateCache_(name);
}

/* ---------------------------------------------------------------- IDs */
/** Reserve n IDs for a sheet from SYS_SEQUENCE. Caller must hold the script lock (api() does). */
function nextIds_(sheetName, n) {
  n = n || 1;
  const entity = SCHEMA[sheetName].entity;
  if (!entity) throw new Error('No ID sequence for ' + sheetName);
  const seq = rows_('SYS_SEQUENCE').find(function (r) { return r.ENTITY === entity; });
  if (!seq) throw new Error('SYS_SEQUENCE has no row for ' + entity);
  const useFy = String(seq.USE_FY).toUpperCase() === 'Y';
  const fy = String(cfg_('CURRENT_FY') || '');
  let last = Number(seq.LAST_NUMBER) || 0;
  if (useFy && String(seq.LAST_FY) !== fy) last = 0;
  const pad = Number(seq.PAD_LENGTH) || 4, ids = [];
  for (let i = 1; i <= n; i++) {
    const num = String(last + i);
    ids.push(seq.PREFIX + '-' + (useFy ? fy + '-' : '') + (num.length < pad ? '0'.repeat(pad - num.length) + num : num));
  }
  update_('SYS_SEQUENCE', seq, { LAST_NUMBER: last + n, LAST_FY: useFy ? fy : '' }, false);
  return ids;
}

/* ---------------------------------------------------------------- config & lookups */
function cfg_(key) {
  if (!_DB.cfg) {
    _DB.cfg = {};
    cachedRows_('SYS_CONFIG').forEach(function (r) { if (String(r.STATUS).toUpperCase() !== 'INACTIVE') _DB.cfg[r.CONFIG_KEY] = r.CONFIG_VALUE; });
  }
  return _DB.cfg[key] === undefined ? '' : _DB.cfg[key];
}

function lookups_() {
  const out = {};
  cachedRows_('SYS_LOOKUP').filter(function (r) { return String(r.STATUS).toUpperCase() !== 'INACTIVE'; })
    .sort(function (a, b) { return (Number(a.SORT_ORDER) || 0) - (Number(b.SORT_ORDER) || 0); })
    .forEach(function (r) { (out[r.LIST_NAME] = out[r.LIST_NAME] || []).push(r.VALUE); });
  return out;
}

function productMap_() { if (!_DB.pm) _DB.pm = indexBy_(cachedRows_('MST_PRODUCT'), 'PRODUCT_ID'); return _DB.pm; }
function uomMap_() { if (!_DB.um) _DB.um = indexBy_(cachedRows_('MST_UOM'), 'UOM_CODE'); return _DB.um; }
function product_(id) { const p = productMap_()[id]; if (!p) throw new Error('Product ' + id + ' not found'); return p; }

/* ---------------------------------------------------------------- audit */
function logAudit_(action, sheet, id, field, oldV, newV) {
  _DB.audit.push({ LOG_TIME: new Date(), USER_EMAIL: currentEmail_(), ACTION: action, SHEET_NAME: sheet, RECORD_ID: String(id),
    FIELD_NAME: field || '', OLD_VALUE: fmtVal_(oldV), NEW_VALUE: fmtVal_(newV) });
}
function flushAudit_() {
  if (!_DB.audit.length) return;
  const buf = _DB.audit; _DB.audit = [];
  const ids = nextIds_('SYS_AUDIT_LOG', buf.length);
  buf.forEach(function (r, i) { r.LOG_ID = ids[i]; });
  insert_('SYS_AUDIT_LOG', buf);
}

/* ---------------------------------------------------------------- validation */
/** Throw if any required column (r = 'Y', not system-written) is empty. */
function requireFields_(name, obj, extra) {
  const missing = [];
  SCHEMA[name].cols.forEach(function (c) {
    if (c.r !== 'Y' || c.by === 'SYSTEM' || c.n === SCHEMA[name].pk) return;
    if (obj[c.n] === undefined || obj[c.n] === null || String(obj[c.n]).trim() === '') missing.push(c.n);
  });
  (extra || []).forEach(function (k) { if (obj[k] === undefined || obj[k] === '' || obj[k] === null) missing.push(k); });
  if (missing.length) throw new Error(name + ': required field(s) missing – ' + missing.join(', '));
}

/* ---------------------------------------------------------------- utils */
function num_(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function round_(v, d) { const p = Math.pow(10, d === undefined ? 2 : d); return Math.round((Number(v) || 0) * p) / p; }
function blank_(v) { return v === undefined || v === null || String(v).trim() === ''; }
function tz_() { return cfg_('TIMEZONE') || Session.getScriptTimeZone() || 'Asia/Kolkata'; }
function today_() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function addDays_(d, n) { const x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
function parseDate_(v) {
  if (v instanceof Date) return v;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
}
function fmtVal_(v) {
  if (v instanceof Date) {
    const hasTime = v.getHours() || v.getMinutes();
    return Utilities.formatDate(v, tz_(), hasTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  }
  return v === undefined || v === null ? '' : v;
}
/** Make any value safe for google.script.run (Dates -> strings). */
function serialize_(v) {
  if (v instanceof Date) return fmtVal_(v);
  if (Array.isArray(v)) return v.map(serialize_);
  if (v && typeof v === 'object') { const o = {}; Object.keys(v).forEach(function (k) { o[k] = serialize_(v[k]); }); return o; }
  return v;
}
function sumBy_(rows, fn) { return rows.reduce(function (s, r) { return s + (Number(fn(r)) || 0); }, 0); }
function key_() { return Array.prototype.slice.call(arguments).join('|'); }
