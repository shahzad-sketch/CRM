/**
 * ============================================================================
 *  Project.gs – STAGE 01 (generic masters) + STAGE 02 (projects & stage plan).
 * ============================================================================
 */

/* ---------------------------------------------------------------- generic record save (masters, settings, project) */
/** p: {sheet, record} – insert when PK is blank / not found, otherwise update USER-editable columns. */
function saveRecord_(p) {
  const name = p.sheet, rec = Object.assign({}, p.record || {});
  if (GENERIC_EDITABLE.indexOf(name) < 0) throw new Error(name + ' cannot be edited directly – use its workflow screen.');
  const def = SCHEMA[name], pk = def.pk;
  // sheets without a primary key (SYS_LOOKUP, MST_ROLE_PERMISSION) are edited by row number
  const existing = pk ? (!blank_(rec[pk]) ? findOne_(name, pk, rec[pk]) : null)
    : (p.row ? rows_(name).find(function (r) { return r._row === Number(p.row); }) || null : null);
  assertCan_(def.module, existing ? 'E' : 'C');

  // user-editable columns only
  const editable = def.cols.filter(function (c) { return c.by !== 'SYSTEM' && ['CREATED_AT', 'CREATED_BY', 'UPDATED_AT', 'UPDATED_BY'].indexOf(c.n) < 0; })
    .map(function (c) { return c.n; });
  const clean = {};
  editable.forEach(function (k) { if (k in rec) clean[k] = typeof rec[k] === 'string' ? rec[k].trim() : rec[k]; });

  // unique checks
  def.cols.filter(function (c) { return c.ref === 'UNIQUE'; }).forEach(function (c) {
    if (blank_(clean[c.n])) return;
    const dup = rows_(name).find(function (r) { return String(r[c.n]).toLowerCase() === String(clean[c.n]).toLowerCase() && r !== existing; });
    if (dup) throw new Error(c.n + ' "' + clean[c.n] + '" already exists');
  });
  if (name === 'MST_USER' && clean.EMAIL) clean.EMAIL = String(clean.EMAIL).toLowerCase();

  if (existing) {
    update_(name, existing, clean);
    return serialize_(existing);
  }
  if (name === 'MST_PRODUCT' && blank_(clean.SKU)) clean.SKU = '(auto)';
  if (name === 'MST_ROLE_PERMISSION' && rows_(name).some(function (r) { return r.ROLE === clean.ROLE && r.MODULE === clean.MODULE; }))
    throw new Error('Permission row already exists for ' + clean.ROLE + ' / ' + clean.MODULE);
  if (name === 'MST_PRODUCT') {
    ['PURCHASE_TO_BASE', 'ISSUE_TO_BASE'].forEach(function (k) { if (blank_(clean[k])) clean[k] = 1; });
    ['IS_SERIALIZED', 'IS_BATCH_TRACKED', 'IS_EXPIRY_TRACKED'].forEach(function (k) { if (blank_(clean[k])) clean[k] = 'N'; });
    if (blank_(clean.PURCHASE_UOM)) clean.PURCHASE_UOM = clean.BASE_UOM;
    if (blank_(clean.ISSUE_UOM)) clean.ISSUE_UOM = clean.BASE_UOM;
  }
  if (name === 'PRJ_PROJECT' && blank_(clean.PROJECT_STATUS)) clean.PROJECT_STATUS = (lookups_().PROJECT_STATUS || ['DESIGN'])[0];
  if (blank_(clean.STATUS) && def.cols.some(function (c) { return c.n === 'STATUS'; })) clean.STATUS = 'ACTIVE';
  requireFields_(name, clean);
  if (def.entity) clean[pk] = nextIds_(name)[0];
  else if (pk && blank_(clean[pk])) throw new Error(pk + ' is required');
  if (name === 'MST_PRODUCT') {
    if (clean.SKU === '(auto)') {
      const cat = findOne_('MST_CATEGORY', 'CATEGORY_ID', clean.CATEGORY_ID);
      clean.SKU = (cat ? cat.CATEGORY_CODE : 'GEN') + '-' + clean[pk].split('-').pop();
    }
  }
  insert_(name, [clean]);
  logAudit_('CREATE', name, pk ? clean[pk] : JSON.stringify(clean).slice(0, 80), '', '', '');
  if (name === 'PRJ_PROJECT') createStagePlan_({ PROJECT_ID: clean.PROJECT_ID });
  return serialize_(clean);
}

/* ---------------------------------------------------------------- lead sync (time trigger + button) */
function syncLeads_() {
  const id = String(cfg_('LEAD_SPREADSHEET_ID') || ''), tab = String(cfg_('LEAD_SHEET_TAB') || '');
  if (!id || id.charAt(0) === '<') throw new Error('Set LEAD_SPREADSHEET_ID and LEAD_SHEET_TAB in SYS_CONFIG first.');
  const sh = SpreadsheetApp.openById(id).getSheetByName(tab);
  if (!sh) throw new Error('Tab "' + tab + '" not found in the lead spreadsheet');
  const v = sh.getDataRange().getValues();
  const head = v.shift().map(function (x) { return String(x).trim().toUpperCase(); });
  const want = String(cfg_('LEAD_SYNC_STATUS') || '').trim().toUpperCase();
  const existing = indexBy_(rows_('PRJ_PROJECT'), 'PROJECT_ID'), now = new Date(), ins = [];
  let updated = 0;
  v.forEach(function (r) {
    const lead = {};
    head.forEach(function (k, i) { const f = LEAD_FIELD_MAP[k]; if (f) lead[f] = r[i]; });
    if (blank_(lead.PROJECT_ID)) return;
    if (want && String(lead._LEAD_STATUS || '').trim().toUpperCase() !== want) return;
    delete lead._LEAD_STATUS;
    lead.PROJECT_ID = String(lead.PROJECT_ID).trim();
    const ex = existing[lead.PROJECT_ID];
    if (ex) {
      const before = ex.UPDATED_AT;
      update_('PRJ_PROJECT', ex, lead, false);
      if (ex.UPDATED_AT !== before) { update_('PRJ_PROJECT', ex, { LAST_SYNCED_AT: now }, false); updated++; }
    } else {
      lead.PROJECT_NAME = lead.PROJECT_NAME || lead.CLIENT_NAME || lead.PROJECT_ID;
      lead.CLIENT_NAME = lead.CLIENT_NAME || lead.PROJECT_NAME;
      lead.CLOSURE_DATE = lead.CLOSURE_DATE || today_();
      lead.PROJECT_STATUS = (lookups_().PROJECT_STATUS || ['CLOSED - AWAITING KICKOFF'])[0];
      lead.LAST_SYNCED_AT = now;
      ins.push(lead);
      existing[lead.PROJECT_ID] = lead;
    }
  });
  insert_('PRJ_PROJECT', ins);
  ins.forEach(function (p) { createStagePlan_({ PROJECT_ID: p.PROJECT_ID }); });
  return { inserted: ins.length, updated: updated };
}

/* ---------------------------------------------------------------- stage plan */
/** Creates one PRJ_STAGE row per active MST_WORK_STAGE (skips stages already present). */
function createStagePlan_(p) {
  const pid = p.PROJECT_ID;
  mustFind_('PRJ_PROJECT', 'PROJECT_ID', pid, 'Project');
  const have = {};
  rows_('PRJ_STAGE').forEach(function (r) { if (r.PROJECT_ID === pid) have[r.STAGE_CODE] = 1; });
  const stages = cachedRows_('MST_WORK_STAGE').filter(function (s) { return String(s.STATUS).toUpperCase() === 'ACTIVE' && !have[s.STAGE_CODE]; })
    .sort(function (a, b) { return num_(a.SEQUENCE) - num_(b.SEQUENCE); });
  if (!stages.length) return { created: 0 };
  const ids = nextIds_('PRJ_STAGE', stages.length);
  insert_('PRJ_STAGE', stages.map(function (s, i) {
    return { PROJECT_STAGE_ID: ids[i], PROJECT_ID: pid, STAGE_CODE: s.STAGE_CODE, SEQUENCE: s.SEQUENCE, PROGRESS_PCT: 0, STAGE_STATUS: 'NOT STARTED' };
  }));
  refreshCurrentStage_(pid);
  return { created: stages.length };
}

/** p: {PROJECT_STAGE_ID, STAGE_STATUS, PROGRESS_PCT, PLANNED_START, PLANNED_END, SUPERVISOR_ID, REMARKS} */
function updateStage_(p) {
  const r = mustFind_('PRJ_STAGE', 'PROJECT_STAGE_ID', p.PROJECT_STAGE_ID, 'Project stage');
  const patch = {};
  ['STAGE_STATUS', 'PROGRESS_PCT', 'PLANNED_START', 'PLANNED_END', 'ACTUAL_START', 'ACTUAL_END', 'SUPERVISOR_ID', 'REMARKS']
    .forEach(function (k) { if (k in p) patch[k] = p[k]; });
  if (patch.STAGE_STATUS === 'IN PROGRESS' && blank_(r.ACTUAL_START) && blank_(patch.ACTUAL_START)) patch.ACTUAL_START = today_();
  if (patch.STAGE_STATUS === 'COMPLETED') { patch.PROGRESS_PCT = 100; if (blank_(r.ACTUAL_END) && blank_(patch.ACTUAL_END)) patch.ACTUAL_END = today_(); }
  update_('PRJ_STAGE', r, patch);
  refreshCurrentStage_(r.PROJECT_ID);
  return serialize_(r);
}

/** Mark a stage IN PROGRESS when the first material is issued to it. */
function touchStage_(projectId, stageCode) {
  const r = rows_('PRJ_STAGE').find(function (s) { return s.PROJECT_ID === projectId && s.STAGE_CODE === stageCode; });
  if (r && ['NOT STARTED', 'MATERIAL PENDING'].indexOf(r.STAGE_STATUS) >= 0) {
    update_('PRJ_STAGE', r, { STAGE_STATUS: 'IN PROGRESS', ACTUAL_START: blank_(r.ACTUAL_START) ? today_() : r.ACTUAL_START });
    refreshCurrentStage_(projectId);
  }
}

function refreshCurrentStage_(projectId) {
  const proj = findOne_('PRJ_PROJECT', 'PROJECT_ID', projectId);
  if (!proj) return;
  const open = rows_('PRJ_STAGE').filter(function (s) { return s.PROJECT_ID === projectId && ['COMPLETED', 'SKIPPED'].indexOf(s.STAGE_STATUS) < 0; })
    .sort(function (a, b) { return num_(a.SEQUENCE) - num_(b.SEQUENCE); });
  update_('PRJ_PROJECT', proj, { CURRENT_STAGE_CODE: open.length ? open[0].STAGE_CODE : '' }, false);
}

/** Stage overview for one project: stages left, BOM vs actual cost per stage. */
function projectOverview_(p) {
  const proj = mustFind_('PRJ_PROJECT', 'PROJECT_ID', p.PROJECT_ID, 'Project');
  const stages = rows_('PRJ_STAGE').filter(function (s) { return s.PROJECT_ID === proj.PROJECT_ID; })
    .sort(function (a, b) { return num_(a.SEQUENCE) - num_(b.SEQUENCE); });
  const names = indexBy_(cachedRows_('MST_WORK_STAGE'), 'STAGE_CODE');
  stages.forEach(function (s) { s.STAGE_NAME = (names[s.STAGE_CODE] || {}).STAGE_NAME || s.STAGE_CODE; });
  return {
    project: proj,
    stages: stages,
    stagesLeft: stages.filter(function (s) { return ['COMPLETED', 'SKIPPED'].indexOf(s.STAGE_STATUS) < 0; }).length,
    tracker: rows_('RPT_BOM_VS_ACTUAL').filter(function (r) { return r.PROJECT_ID === proj.PROJECT_ID; })
  };
}
