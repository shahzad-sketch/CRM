/**
 * ============================================================================
 *  Auth.gs – own LOGIN & REGISTRATION portal (no Google session needed).
 *  - Users register (name, email, phone, department, role, password) → STATUS = PENDING.
 *  - An admin approves them (My approvals, or Masters → Users) → STATUS = ACTIVE.
 *  - Emails listed in SUPER_ADMINS (Config.gs) are activated as ADMIN on registration.
 *  - Passwords: salted SHA-256 (PASSWORD_HASH / PASSWORD_SALT in MST_USER), never sent to the browser.
 *  - Login returns a session token (kept 6 h, renewed on every action). 5 wrong passwords = 15 min lock.
 *  Deploy the web app as "Execute as: Me" + "Who has access: Anyone".
 * ============================================================================
 */
const SESSION_SECONDS = 21600;          // 6 h, renewed on every call
const MAX_LOGIN_FAILS = 5;              // then locked for LOCK_SECONDS
const LOCK_SECONDS = 900;
const HASH_ROUNDS = 300;
const SECRET_COLS = ['PASSWORD_HASH', 'PASSWORD_SALT'];

/* ---------------------------------------------------------------- current user */
function currentEmail_() {
  if (_DB.user) return _DB.user.EMAIL;
  let e = '';
  try { e = Session.getEffectiveUser().getEmail(); } catch (err) { }
  return String(e || 'system').toLowerCase();
}

/** The logged-in user for this call (from the session token), or the SYSTEM user for triggers / editor runs. */
function currentUser_() {
  if (_DB.user) return _DB.user;
  if (!_DB.token) {
    if (!_DB.web) {   // time trigger or function run from the editor
      _DB.user = { USER_ID: 'SYSTEM', FULL_NAME: 'System', EMAIL: currentEmail_(), ROLE: 'ADMIN', DEFAULT_LOCATION_ID: cfg_('DEFAULT_WAREHOUSE_ID') };
      return _DB.user;
    }
    throw new Error('LOGIN_REQUIRED: Please log in.');
  }
  const c = CacheService.getScriptCache(), raw = c.get('S:' + _DB.token);
  if (!raw) throw new Error('SESSION_EXPIRED: Your session has expired. Please log in again.');
  const sess = JSON.parse(raw);
  const u = cachedRows_('MST_USER').find(function (r) { return r.USER_ID === sess.u; });
  if (!u || String(u.STATUS).toUpperCase() !== 'ACTIVE') {
    c.remove('S:' + _DB.token);
    throw new Error('SESSION_EXPIRED: Your account is not active. Contact the admin.');
  }
  c.put('S:' + _DB.token, raw, SESSION_SECONDS);   // sliding expiry
  const email = String(u.EMAIL).toLowerCase();
  _DB.user = { USER_ID: u.USER_ID, FULL_NAME: u.FULL_NAME, EMAIL: email, ROLE: isSuperAdmin_(email) ? 'ADMIN' : u.ROLE,
    DEFAULT_LOCATION_ID: u.DEFAULT_LOCATION_ID, PHONE: u.PHONE, DEPARTMENT: u.DEPARTMENT };
  return _DB.user;
}

function isSuperAdmin_(email) {
  return SUPER_ADMINS.map(function (x) { return String(x).trim().toLowerCase(); }).indexOf(String(email).trim().toLowerCase()) >= 0;
}

/* ---------------------------------------------------------------- passwords */
function hashPassword_(password, salt) {
  let h = salt + '|' + password;
  for (let i = 0; i < HASH_ROUNDS; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + salt, Utilities.Charset.UTF_8));
  }
  return h;
}
function newSalt_() { return Utilities.getUuid().replace(/-/g, ''); }
function checkPasswordRules_(pw) {
  pw = String(pw || '');
  if (pw.length < 6) throw new Error('Password must be at least 6 characters.');
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) throw new Error('Password must contain letters and numbers.');
}
function validEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '')); }

/* ---------------------------------------------------------------- public actions (no login needed) */
/** Lists shown on the registration form. */
function registerOptions_() {
  const lk = lookups_();
  return { roles: (lk.ROLE || []).filter(function (r) { return r !== 'ADMIN'; }), departments: lk.DEPARTMENT || [], app: APP_NAME,
    company: cfg_('COMPANY_NAME') };
}

/** p: {FULL_NAME, EMAIL, PHONE, DEPARTMENT, ROLE, PASSWORD} */
function register_(p) {
  const email = String(p.EMAIL || '').trim().toLowerCase();
  if (blank_(p.FULL_NAME)) throw new Error('Full name is required.');
  if (!validEmail_(email)) throw new Error('Enter a valid email address.');
  checkPasswordRules_(p.PASSWORD);
  const sa = isSuperAdmin_(email);
  const salt = newSalt_(), hash = hashPassword_(p.PASSWORD, salt);
  const ex = liveRows_('MST_USER').find(function (r) { return String(r.EMAIL).toLowerCase() === email; });
  if (ex && !blank_(ex.PASSWORD_HASH)) throw new Error('This email is already registered. Use Login, or ask the admin to reset your password.');
  if (ex) {
    // user created earlier by the admin without a password: set it, but an admin must (re)approve unless super admin
    update_('MST_USER', ex, { PASSWORD_HASH: hash, PASSWORD_SALT: salt, STATUS: sa ? 'ACTIVE' : 'PENDING', ROLE: sa ? 'ADMIN' : ex.ROLE,
      PHONE: ex.PHONE || p.PHONE, DEPARTMENT: ex.DEPARTMENT || p.DEPARTMENT }, false);
  } else {
    const role = sa ? 'ADMIN' : (p.ROLE && p.ROLE !== 'ADMIN' ? p.ROLE : 'SITE SUPERVISOR');
    insert_('MST_USER', [{ USER_ID: nextIds_('MST_USER')[0], FULL_NAME: String(p.FULL_NAME).trim(), EMAIL: email, PHONE: p.PHONE || '',
      DEPARTMENT: p.DEPARTMENT || '', ROLE: role, DEFAULT_LOCATION_ID: cfg_('DEFAULT_WAREHOUSE_ID'), STATUS: sa ? 'ACTIVE' : 'PENDING',
      PASSWORD_HASH: hash, PASSWORD_SALT: salt, CREATED_BY: email }]);
  }
  logAudit_('REGISTER', 'MST_USER', email, '', '', sa ? 'ACTIVE (super admin)' : 'PENDING');
  return { status: sa ? 'ACTIVE' : 'PENDING',
    message: sa ? 'Admin account created. You can log in now.' : 'Registration received. You can log in after the admin approves your account.' };
}

/** p: {EMAIL, PASSWORD} → {token, user} */
function login_(p) {
  const email = String(p.EMAIL || '').trim().toLowerCase();
  const c = CacheService.getScriptCache(), fk = 'F:' + email;
  const fails = Number(c.get(fk) || 0);
  if (fails >= MAX_LOGIN_FAILS) throw new Error('Too many wrong attempts. Try again in 15 minutes.');
  const u = liveRows_('MST_USER').find(function (r) { return String(r.EMAIL).toLowerCase() === email; });
  const bad = function () { c.put(fk, String(fails + 1), LOCK_SECONDS); throw new Error('Wrong email or password.'); };
  if (!u || blank_(u.PASSWORD_HASH)) return bad();
  if (hashPassword_(p.PASSWORD || '', u.PASSWORD_SALT) !== u.PASSWORD_HASH) return bad();
  const st = String(u.STATUS).toUpperCase();
  if (st === 'PENDING') throw new Error('Your registration is waiting for admin approval.');
  if (st !== 'ACTIVE') throw new Error('Your account is ' + st + '. Contact the admin.');
  c.remove(fk);
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  c.put('S:' + token, JSON.stringify({ u: u.USER_ID, t: Date.now() }), SESSION_SECONDS);
  update_('MST_USER', u, { LAST_LOGIN: new Date() }, false);
  _DB.token = token; _DB.user = null;
  return { token: token, user: currentUser_() };
}

function logout_() {
  if (_DB.token) CacheService.getScriptCache().remove('S:' + _DB.token);
  return { loggedOut: true };
}

/** Logged-in user changes own password. p: {OLD_PASSWORD, NEW_PASSWORD} */
function changePassword_(p) {
  const me = currentUser_();
  const u = mustFind_('MST_USER', 'USER_ID', me.USER_ID, 'User');
  if (hashPassword_(p.OLD_PASSWORD || '', u.PASSWORD_SALT) !== u.PASSWORD_HASH) throw new Error('Current password is wrong.');
  checkPasswordRules_(p.NEW_PASSWORD);
  const salt = newSalt_();
  update_('MST_USER', u, { PASSWORD_HASH: hashPassword_(p.NEW_PASSWORD, salt), PASSWORD_SALT: salt }, false);
  logAudit_('PASSWORD', 'MST_USER', u.USER_ID, '', '', 'changed by user');
  return { changed: true };
}

/** Admin sets a temporary password for a user. p: {USER_ID} → {tempPassword} */
function resetPassword_(p) {
  assertCan_('MASTERS', 'E');
  const u = mustFind_('MST_USER', 'USER_ID', p.USER_ID, 'User');
  const temp = 'Ims' + Math.floor(100000 + Math.random() * 900000);
  const salt = newSalt_();
  update_('MST_USER', u, { PASSWORD_HASH: hashPassword_(temp, salt), PASSWORD_SALT: salt }, false);
  CacheService.getScriptCache().remove('F:' + String(u.EMAIL).toLowerCase());
  logAudit_('PASSWORD', 'MST_USER', u.USER_ID, '', '', 'reset by admin');
  return { USER_ID: u.USER_ID, EMAIL: u.EMAIL, tempPassword: temp };
}

/** Approve / reject a registration (from My approvals). */
function approveUser_(id, ok, reason) {
  if (!can_('MASTERS', 'A') && !can_('MASTERS', 'E')) throw new Error('Only an admin can approve users.');
  const u = mustFind_('MST_USER', 'USER_ID', id, 'User');
  if (String(u.STATUS).toUpperCase() !== 'PENDING') throw new Error('User is ' + u.STATUS);
  update_('MST_USER', u, { STATUS: ok ? 'ACTIVE' : 'REJECTED' });
  return u;
}

/** Remove password columns before anything goes to the browser. */
function stripSecrets_(v) {
  if (Array.isArray(v)) return v.map(stripSecrets_);
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    const o = {};
    Object.keys(v).forEach(function (k) { if (SECRET_COLS.indexOf(k) < 0) o[k] = stripSecrets_(v[k]); });
    return o;
  }
  return v;
}

/* ---------------------------------------------------------------- permissions (unchanged) */
const PERM_COL_ = { V: 'CAN_VIEW', C: 'CAN_CREATE', E: 'CAN_EDIT', A: 'CAN_APPROVE' };

function permissions_() {
  const role = currentUser_().ROLE, out = {};
  cachedRows_('MST_ROLE_PERMISSION').filter(function (r) { return r.ROLE === role; }).forEach(function (r) {
    out[r.MODULE] = Object.keys(PERM_COL_).filter(function (p) { return String(r[PERM_COL_[p]]).toUpperCase() === 'Y'; }).join('');
  });
  return out;
}

function can_(module, p) {
  if (currentUser_().ROLE === 'ADMIN') return true;
  if (!_DB.perms) _DB.perms = permissions_();
  return (_DB.perms[module] || '').indexOf(p) >= 0;
}

function assertCan_(module, p) {
  if (!can_(module, p)) {
    const words = { V: 'view', C: 'create', E: 'edit', A: 'approve' };
    throw new Error('Your role (' + currentUser_().ROLE + ') cannot ' + words[p] + ' in ' + module + '.');
  }
}

/**
 * Approval check against SYS_APPROVAL_MATRIX.
 * Rules for the doc type whose MIN..MAX band contains the value are taken; the highest APPROVAL_LEVEL in
 * that band decides the approver role. If no rule exists, the module's CAN_APPROVE permission decides.
 */
function canApprove_(docType, value, module) {
  const role = currentUser_().ROLE;
  if (role === 'ADMIN') return true;
  value = Number(value) || 0;
  const rules = cachedRows_('SYS_APPROVAL_MATRIX').filter(function (r) {
    return String(r.STATUS).toUpperCase() === 'ACTIVE' && r.DOC_TYPE === docType &&
      value >= num_(r.MIN_VALUE) && value <= num_(r.MAX_VALUE || 999999999);
  });
  if (!rules.length) return can_(module, 'A');
  const top = Math.max.apply(null, rules.map(function (r) { return num_(r.APPROVAL_LEVEL); }));
  return rules.some(function (r) { return num_(r.APPROVAL_LEVEL) === top && r.APPROVER_ROLE === role; });
}

function assertApprove_(docType, value, module) {
  if (!canApprove_(docType, value, module))
    throw new Error('Your role (' + currentUser_().ROLE + ') cannot approve this ' + docType + ' (value ' + round_(value) + '). Check SYS_APPROVAL_MATRIX.');
}
