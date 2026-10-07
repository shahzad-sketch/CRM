/**
 * ============================================================================
 *  Support.gs – ONE place to maintain every dropdown: the "Support" sheet.
 *  (SUPPORT_SPREADSHEET_ID / SUPPORT_SHEET_TAB in Config.gs)
 *
 *  Layout: row 1 = list names, values written downwards under each name.
 *    CATEGORY                → Masters → Categories (MST_CATEGORY)
 *    SUB_CATEGORY + SUB_CATEGORY_OF (same row = parent category) → MST_SUBCATEGORY
 *    UOM                     → Units (MST_UOM)
 *    any other column        → dropdown list of that name (SYS_LOOKUP), e.g. BRAND, SIZE, DEPARTMENT, AREA …
 *  Values removed from the Support sheet become INACTIVE (old records keep them, new forms stop offering them).
 *  System lists (statuses, roles, transaction types …) are protected and cannot be changed from here.
 *  Sync runs every 15 minutes (trigger), from Settings → Sync Support sheet, or step7_SyncSupport().
 * ============================================================================
 */

/** Lists the workflow logic depends on – never changed from the Support sheet. */
const PROTECTED_LISTS = ['ROLE', 'PROJECT_STATUS', 'STAGE_STATUS', 'BOM_TYPE', 'BOM_STATUS', 'MATERIAL_SOURCE', 'ALLOCATION_STATUS',
  'PR_SOURCE', 'PR_STATUS', 'PR_LINE_STATUS', 'PO_STATUS', 'PO_LINE_STATUS', 'INSPECTION_STATUS', 'GRN_STATUS', 'RTV_STATUS', 'TXN_TYPE',
  'TRANSFER_STATUS', 'MR_STATUS', 'ISSUE_STATUS', 'RETURN_STATUS', 'RETURN_CONDITION'];

/** Count-type units: whole numbers only (BOM gross qty is rounded up). */
const WHOLE_UNITS = ['NOS', 'PCS', 'SET', 'PAIR', 'SHEET', 'BOX', 'ROLL', 'BAG', 'PKT', 'PACKET', 'BUNDLE', 'COIL', 'LENGTH', 'UNIT'];

/** Default Support content (used only when the Support tab is empty). */
const SUPPORT_DEFAULTS = {
  SUB_CATEGORY: [
    ['PLYWOOD', 'WOOD'], ['MDF', 'WOOD'], ['HDHMR', 'WOOD'], ['BLOCKBOARD', 'WOOD'], ['SOLID WOOD', 'WOOD'],
    ['HINGES', 'HARDWARE'], ['DRAWER CHANNELS', 'HARDWARE'], ['HANDLES', 'HARDWARE'], ['LOCKS', 'HARDWARE'], ['SCREWS & FASTENERS', 'HARDWARE'], ['TANDEM BOX', 'HARDWARE'],
    ['WIRES & CABLES', 'ELECTRICAL'], ['SWITCHES & SOCKETS', 'ELECTRICAL'], ['CONDUITS', 'ELECTRICAL'], ['MCB & DB', 'ELECTRICAL'],
    ['PANEL LIGHT', 'LIGHTING'], ['PROFILE LIGHT', 'LIGHTING'], ['SPOT LIGHT', 'LIGHTING'], ['STRIP LIGHT', 'LIGHTING'], ['DECORATIVE LIGHT', 'LIGHTING'],
    ['CPVC PIPES', 'PLUMBING'], ['PIPE FITTINGS', 'PLUMBING'], ['VALVES', 'PLUMBING'],
    ['PRIMER', 'PAINT'], ['PUTTY', 'PAINT'], ['EMULSION', 'PAINT'], ['ENAMEL', 'PAINT'], ['PU / MELAMINE', 'PAINT'],
    ['1 MM LAMINATE', 'LAMINATE'], ['0.8 MM LAMINATE', 'LAMINATE'], ['LINER', 'LAMINATE'], ['ACRYLIC', 'LAMINATE'],
    ['NATURAL VENEER', 'VENEER'], ['RECON VENEER', 'VENEER'],
    ['CLEAR GLASS', 'GLASS'], ['FROSTED GLASS', 'GLASS'], ['LACQUERED GLASS', 'GLASS'], ['PLAIN MIRROR', 'MIRROR'], ['TINTED MIRROR', 'MIRROR'],
    ['UPHOLSTERY', 'FABRIC'], ['CURTAIN', 'FABRIC'], ['MODULAR FITTINGS', 'KITCHEN'], ['SINK & FAUCET', 'KITCHEN'], ['APPLIANCES', 'KITCHEN'],
    ['SANITARYWARE', 'BATHROOM'], ['CP FITTINGS', 'BATHROOM'], ['GYPSUM BOARD', 'FALSE CEILING'], ['CEILING CHANNELS', 'FALSE CEILING'], ['GRID CEILING', 'FALSE CEILING'],
    ['VITRIFIED TILES', 'FLOORING'], ['WOODEN FLOORING', 'FLOORING'], ['VINYL', 'FLOORING'], ['WALLPAPER', 'WALL FINISH'], ['WALL PANELS', 'WALL FINISH'],
    ['WOOD ADHESIVE', 'ADHESIVE'], ['SILICONE', 'ADHESIVE'], ['TILE ADHESIVE', 'ADHESIVE'], ['POWER TOOLS', 'TOOLS'], ['HAND TOOLS', 'TOOLS'],
    ['PPE', 'SAFETY'], ['CONSUMABLES', 'MISCELLANEOUS']
  ],
  BRAND: ['CENTURYPLY', 'GREENPLY', 'ACTION TESA', 'MERINO', 'GREENLAM', 'HETTICH', 'HAFELE', 'EBCO', 'BLUM', 'ASIAN PAINTS', 'BERGER', 'HAVELLS', 'POLYCAB', 'ANCHOR', 'PHILIPS', 'JAQUAR', 'KAJARIA', 'SAINT-GOBAIN', 'FEVICOL', 'LOCAL'],
  SIZE: ['8X4 FT', '7X4 FT', '6X4 FT', '8X3 FT', '600X600 MM', '800X800 MM', '1200X600 MM', 'STANDARD'],
  THICKNESS: ['0.8 MM', '1 MM', '6 MM', '9 MM', '12 MM', '16 MM', '18 MM', '19 MM', '25 MM'],
  COLOR: ['WHITE', 'BLACK', 'GREY', 'BEIGE', 'WALNUT', 'OAK', 'TEAK', 'AS PER DESIGN'],
  FINISH: ['MATT', 'GLOSSY', 'SUEDE', 'TEXTURED', 'HIGH GLOSS', 'NATURAL'],
  SUPPLIER_TYPE: ['MANUFACTURER', 'DEALER', 'DISTRIBUTOR', 'CONTRACTOR', 'LOCAL VENDOR']
};
/** Column order of the Support tab. */
const SUPPORT_COLUMNS = ['CATEGORY', 'SUB_CATEGORY', 'SUB_CATEGORY_OF', 'UOM', 'BRAND', 'SIZE', 'THICKNESS', 'COLOR', 'FINISH', 'SUPPLIER_TYPE',
  'DEPARTMENT', 'PROJECT_TYPE', 'AREA', 'WASTE_TYPE', 'PRIORITY', 'PAYMENT_TERMS', 'LOCATION_TYPE', 'ADJUSTMENT_REASON', 'RETURN_REASON'];

function supportSheet_() {
  if (!SUPPORT_SPREADSHEET_ID) throw new Error('Set SUPPORT_SPREADSHEET_ID in Config.gs');
  const ss = SpreadsheetApp.openById(SUPPORT_SPREADSHEET_ID);
  return { ss: ss, sh: ss.getSheetByName(SUPPORT_SHEET_TAB) };
}

/* ---------------------------------------------------------------- create the Support tab */
/** Writes the Support layout with the values currently in the system (+ sensible defaults). Never overwrites a filled tab. */
function createSupportSheet_() {
  const s = supportSheet_();
  let sh = s.sh;
  if (!sh) sh = s.ss.insertSheet(SUPPORT_SHEET_TAB);
  if (sh.getLastRow() > 1) return { created: false, message: 'Support tab already has data – left unchanged.' };
  const act = function (r) { return String(r.STATUS || 'ACTIVE').toUpperCase() === 'ACTIVE'; };
  const cats = liveRows_('MST_CATEGORY').filter(act);
  const catName = indexBy_(cats, 'CATEGORY_ID');
  let subs = liveRows_('MST_SUBCATEGORY').filter(act).map(function (r) { return [r.SUBCATEGORY_NAME, (catName[r.CATEGORY_ID] || {}).CATEGORY_NAME || '']; });
  const have = {}; subs.forEach(function (x) { have[String(x[0]).toUpperCase()] = 1; });
  SUPPORT_DEFAULTS.SUB_CATEGORY.forEach(function (x) { if (!have[x[0]] && cats.some(function (c) { return c.CATEGORY_NAME === x[1]; })) subs.push(x); });
  const lk = lookups_();
  const cols = {};
  SUPPORT_COLUMNS.forEach(function (c) { cols[c] = []; });
  cols.CATEGORY = cats.map(function (r) { return r.CATEGORY_NAME; });
  cols.SUB_CATEGORY = subs.map(function (x) { return x[0]; });
  cols.SUB_CATEGORY_OF = subs.map(function (x) { return x[1]; });
  cols.UOM = liveRows_('MST_UOM').filter(act).map(function (r) { return r.UOM_CODE; });
  SUPPORT_COLUMNS.slice(4).forEach(function (c) { cols[c] = (lk[c] && lk[c].length ? lk[c] : (SUPPORT_DEFAULTS[c] || [])).slice(); });
  const height = Math.max.apply(null, SUPPORT_COLUMNS.map(function (c) { return cols[c].length; }));
  const values = [SUPPORT_COLUMNS.slice()];
  for (let i = 0; i < height; i++) values.push(SUPPORT_COLUMNS.map(function (c) { return cols[c][i] === undefined ? '' : cols[c][i]; }));
  sh.clear();
  sh.getRange(1, 1, values.length, SUPPORT_COLUMNS.length).setValues(values);
  sh.getRange(1, 1, 1, SUPPORT_COLUMNS.length).setFontWeight('bold').setFontColor('#ffffff').setBackground('#0f766e');
  sh.getRange(1, 2, 1, 2).setBackground('#b45309');
  sh.setFrozenRows(1);
  sh.getRange(1, 3).setNote('Parent category of the SUB_CATEGORY in the same row. Must match a value in the CATEGORY column.');
  sh.getRange(1, 1).setNote('Add / remove values under any heading. Changes reach the app within 15 minutes, or immediately with Settings → Sync Support sheet. New columns become new dropdown lists.');
  try { sh.autoResizeColumns(1, SUPPORT_COLUMNS.length); } catch (e) { }
  const s1 = s.ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() === 0 && s.ss.getSheets().length > 1) s.ss.deleteSheet(s1);
  return { created: true, rows: height, columns: SUPPORT_COLUMNS.length };
}

/* ---------------------------------------------------------------- sync Support → system */
/** p.force = true ignores the "unchanged" shortcut. */
function syncSupport_(p) {
  const s = supportSheet_();
  if (!s.sh) throw new Error('Tab "' + SUPPORT_SHEET_TAB + '" not found in the Support spreadsheet. Run step6_CreateSupportSheet().');
  const all = s.sh.getDataRange().getValues();
  if (all.length < 2) throw new Error('Support tab is empty. Run step6_CreateSupportSheet().');
  const sig = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(all)));
  const props = PropertiesService.getScriptProperties();
  if (!(p && p.force) && props.getProperty('SUPPORT_SIG') === sig) return { skipped: true, message: 'Support sheet unchanged.' };

  const head = all[0].map(function (h) { return String(h).trim().toUpperCase().replace(/\s+/g, '_'); });
  const colVals = function (name) {
    const i = head.indexOf(name);
    if (i < 0) return null;
    const out = [], seen = {};
    for (let r = 1; r < all.length; r++) {
      const v = String(all[r][i] === undefined ? '' : all[r][i]).trim();
      if (v && !seen[v.toUpperCase()]) { seen[v.toUpperCase()] = 1; out.push(v); }
    }
    return out;
  };
  const rep = [];

  // ---- CATEGORY
  const catVals = colVals('CATEGORY');
  if (catVals) {
    const rows = liveRows_('MST_CATEGORY'), byName = {}, codes = {};
    rows.forEach(function (r) { byName[String(r.CATEGORY_NAME).toUpperCase()] = r; codes[r.CATEGORY_CODE] = 1; });
    const want = {}, ins = [];
    catVals.forEach(function (v) {
      want[v.toUpperCase()] = 1;
      const r = byName[v.toUpperCase()];
      if (r) { if (String(r.STATUS).toUpperCase() !== 'ACTIVE') update_('MST_CATEGORY', r, { STATUS: 'ACTIVE' }); }
      else ins.push({ CATEGORY_NAME: v, CATEGORY_CODE: uniqueCode_(v, codes), STATUS: 'ACTIVE' });
    });
    if (ins.length) { const ids = nextIds_('MST_CATEGORY', ins.length); ins.forEach(function (o, i) { o.CATEGORY_ID = ids[i]; byName[o.CATEGORY_NAME.toUpperCase()] = o; }); insert_('MST_CATEGORY', ins); }
    let off = 0;
    rows.forEach(function (r) { if (!want[String(r.CATEGORY_NAME).toUpperCase()] && String(r.STATUS).toUpperCase() === 'ACTIVE') { update_('MST_CATEGORY', r, { STATUS: 'INACTIVE' }); off++; } });
    rep.push('Categories: ' + catVals.length + ' (' + ins.length + ' new, ' + off + ' deactivated)');
  }

  // ---- SUB_CATEGORY + SUB_CATEGORY_OF (row-wise pairs)
  const si = head.indexOf('SUB_CATEGORY'), pi = head.indexOf('SUB_CATEGORY_OF');
  if (si >= 0) {
    const cats = liveRows_('MST_CATEGORY'), catByName = {};
    cats.forEach(function (c) { catByName[String(c.CATEGORY_NAME).toUpperCase()] = c; });
    const rows = liveRows_('MST_SUBCATEGORY'), have = {};
    rows.forEach(function (r) { have[key_(String(r.SUBCATEGORY_NAME).toUpperCase(), r.CATEGORY_ID)] = r; });
    const want = {}, ins = [], warn = [];
    for (let r = 1; r < all.length; r++) {
      const name = String(all[r][si] || '').trim(); if (!name) continue;
      const parent = pi >= 0 ? String(all[r][pi] || '').trim().toUpperCase() : '';
      const cat = catByName[parent];
      if (!cat) { warn.push(name + ' (parent "' + parent + '" not in CATEGORY)'); continue; }
      const k = key_(name.toUpperCase(), cat.CATEGORY_ID);
      if (want[k]) continue;
      want[k] = 1;
      const ex = have[k];
      if (ex) { if (String(ex.STATUS).toUpperCase() !== 'ACTIVE') update_('MST_SUBCATEGORY', ex, { STATUS: 'ACTIVE' }); }
      else ins.push({ CATEGORY_ID: cat.CATEGORY_ID, SUBCATEGORY_NAME: name, STATUS: 'ACTIVE' });
    }
    if (ins.length) { const ids = nextIds_('MST_SUBCATEGORY', ins.length); ins.forEach(function (o, i) { o.SUBCATEGORY_ID = ids[i]; }); insert_('MST_SUBCATEGORY', ins); }
    let off = 0;
    rows.forEach(function (r) { if (!want[key_(String(r.SUBCATEGORY_NAME).toUpperCase(), r.CATEGORY_ID)] && String(r.STATUS).toUpperCase() === 'ACTIVE') { update_('MST_SUBCATEGORY', r, { STATUS: 'INACTIVE' }); off++; } });
    rep.push('Sub-categories: ' + Object.keys(want).length + ' (' + ins.length + ' new, ' + off + ' deactivated)' + (warn.length ? ' ⚠ skipped: ' + warn.join('; ') : ''));
  }

  // ---- UOM
  const uomVals = colVals('UOM');
  if (uomVals) {
    const rows = liveRows_('MST_UOM'), by = indexBy_(rows, 'UOM_CODE'), want = {}, ins = [];
    uomVals.forEach(function (v) {
      const code = v.toUpperCase(); want[code] = 1;
      if (by[code]) { if (String(by[code].STATUS).toUpperCase() !== 'ACTIVE') update_('MST_UOM', by[code], { STATUS: 'ACTIVE' }); }
      else ins.push({ UOM_CODE: code, UOM_NAME: v, UOM_TYPE: guessUomType_(code), DECIMAL_ALLOWED: WHOLE_UNITS.indexOf(code) >= 0 ? 'N' : 'Y', STATUS: 'ACTIVE' });
    });
    insert_('MST_UOM', ins);
    let off = 0;
    rows.forEach(function (r) { if (!want[String(r.UOM_CODE).toUpperCase()] && String(r.STATUS).toUpperCase() === 'ACTIVE') { update_('MST_UOM', r, { STATUS: 'INACTIVE' }, false); off++; } });
    rep.push('Units: ' + uomVals.length + ' (' + ins.length + ' new, ' + off + ' deactivated)');
  }

  // ---- every other column → SYS_LOOKUP list
  const special = ['CATEGORY', 'SUB_CATEGORY', 'SUB_CATEGORY_OF', 'UOM', ''];
  const lookRows = liveRows_('SYS_LOOKUP'), lookIns = [], protectedSeen = [];
  head.forEach(function (list) {
    if (special.indexOf(list) >= 0) return;
    if (PROTECTED_LISTS.indexOf(list) >= 0) { protectedSeen.push(list); return; }
    const vals = colVals(list) || [];
    const ex = lookRows.filter(function (r) { return r.LIST_NAME === list; }), byVal = {};
    ex.forEach(function (r) { byVal[String(r.VALUE).toUpperCase()] = r; });
    const want = {};
    vals.forEach(function (v, i) {
      want[v.toUpperCase()] = 1;
      const r = byVal[v.toUpperCase()];
      if (r) {
        if (String(r.STATUS).toUpperCase() !== 'ACTIVE' || num_(r.SORT_ORDER) !== i + 1) update_('SYS_LOOKUP', r, { STATUS: 'ACTIVE', SORT_ORDER: i + 1 }, false);
      } else lookIns.push({ LIST_NAME: list, VALUE: v, SORT_ORDER: i + 1, STATUS: 'ACTIVE' });
    });
    ex.forEach(function (r) { if (!want[String(r.VALUE).toUpperCase()] && String(r.STATUS).toUpperCase() === 'ACTIVE') update_('SYS_LOOKUP', r, { STATUS: 'INACTIVE' }, false); });
    rep.push(list + ': ' + vals.length);
  });
  insert_('SYS_LOOKUP', lookIns);
  if (protectedSeen.length) rep.push('⚠ ignored protected system lists: ' + protectedSeen.join(', '));

  props.setProperty('SUPPORT_SIG', sig);
  props.setProperty('SUPPORT_SYNCED_AT', new Date().toISOString());
  return { synced: true, message: rep.join(' · ') };
}

function uniqueCode_(name, used) {
  const base = String(name).toUpperCase().replace(/[^A-Z]/g, '') || 'CAT';
  let code = (base + 'XXX').slice(0, 3), n = 1;
  while (used[code]) { code = base.slice(0, 2) + String(n++); }
  used[code] = 1;
  return code;
}
function guessUomType_(c) {
  if (/^(SQ|SFT|SQFT|SQM)/.test(c)) return 'AREA';
  if (/^(MTR|M|RFT|FT|CM|MM|INCH|RMT)$/.test(c)) return 'LENGTH';
  if (/^(KG|G|GM|TON|MT)$/.test(c)) return 'WEIGHT';
  if (/^(LTR|L|ML)$/.test(c)) return 'VOLUME';
  return 'COUNT';
}

/* ---------------------------------------------------------------- product name → PRODUCT_ID (backend mapping) */
/** Accepts a PRODUCT_ID, an exact product name, "name [UOM]", a SKU, or the old "ID — name" label. Returns the ID or ''. */
function resolveProductId_(v) {
  const s = String(v === undefined || v === null ? '' : v).trim();
  if (!s) return '';
  const pm = productMap_();
  if (pm[s]) return s;
  if (!_DB.pnames) {
    _DB.pnames = {};
    Object.keys(pm).forEach(function (id) {
      const p = pm[id], put = function (k) { if (k) _DB.pnames[String(k).trim().toUpperCase()] = id; };
      put(p.SKU); put(p.PRODUCT_NAME); put(productLabel_(p));
    });
  }
  const u = s.toUpperCase();
  if (_DB.pnames[u]) return _DB.pnames[u];
  const head = s.split(' — ')[0].trim();
  if (pm[head]) return head;
  const noUom = u.replace(/\s*\[[^\]]*\]\s*$/, '');
  return _DB.pnames[noUom] || '';
}
/** Label shown in product dropdowns: "Name [UOM]". */
function productLabel_(p) { return String(p.PRODUCT_NAME) + ' [' + p.BASE_UOM + ']'; }

/** Walks an incoming payload and turns every PRODUCT_ID given as a name / label into the real ID. */
function normalizeProducts_(v) {
  if (Array.isArray(v)) { v.forEach(normalizeProducts_); return v; }
  if (v && typeof v === 'object') {
    Object.keys(v).forEach(function (k) {
      if (k === 'PRODUCT_ID' && typeof v[k] === 'string' && v[k].trim()) {
        const id = resolveProductId_(v[k]);
        if (id) v[k] = id;
        else throw new Error('Product "' + v[k] + '" not found. Pick it from the list, or add it with "+ New product".');
      } else if (v[k] && typeof v[k] === 'object') normalizeProducts_(v[k]);
    });
  }
  return v;
}
