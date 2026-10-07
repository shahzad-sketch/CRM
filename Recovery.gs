/**
 * ============================================================================
 *  Recovery.gs – fix a login from the Apps Script editor (no web app needed).
 *
 *  Passwords are stored ONLY as a scrambled hash (PASSWORD_HASH column). Nobody – not even the admin –
 *  can read a password back. Never type into PASSWORD_HASH / PASSWORD_SALT: that breaks the login.
 *
 *  HOW TO USE
 *   1. Write the email and the NEW password in the two lines below.
 *   2. Select  recoverySetPassword  in the function dropdown ▸ Run.
 *   3. Read the Execution log, then log in to the web app with the new password.
 *   4. Delete the password from line 2 again (put back '') and save.
 *   To test a password without changing it: fill both lines and run  recoveryCheckLogin.
 * ============================================================================
 */
const RECOVERY_EMAIL    = 'mos@ravishvohrahome.in';   // ← user whose password you want to set / check
const RECOVERY_PASSWORD = 'Som@123';                          // ← new password (min 6 characters, letters + numbers)

/** Sets a new password for RECOVERY_EMAIL, unlocks the account, and (for SUPER_ADMINS) makes it an ACTIVE admin. */
function recoverySetPassword() {
  const email = String(RECOVERY_EMAIL).trim().toLowerCase();
  if (!RECOVERY_PASSWORD) throw new Error('Write the new password in RECOVERY_PASSWORD (top of Recovery.gs) first.');
  checkPasswordRules_(RECOVERY_PASSWORD);
  const u = liveRows_('MST_USER').find(function (r) { return String(r.EMAIL).trim().toLowerCase() === email; });
  if (!u) throw new Error('No user with email ' + email + ' in MST_USER. Register on the web app login page first.');
  const salt = newSalt_(), patch = { PASSWORD_HASH: hashPassword_(RECOVERY_PASSWORD, salt), PASSWORD_SALT: salt };
  if (isSuperAdmin_(email)) { patch.STATUS = 'ACTIVE'; patch.ROLE = 'ADMIN'; }
  update_('MST_USER', u, patch, false);
  CacheService.getScriptCache().remove('F:' + email);       // clear "too many wrong attempts" lock
  flushCacheVersions_();
  Logger.log('✔ Password set for ' + email + ' (status ' + u.STATUS + ', role ' + u.ROLE + '). ' +
    'Log in to the web app with the new password, then remove it from RECOVERY_PASSWORD.');
}

/** Tells you whether RECOVERY_PASSWORD is the correct password for RECOVERY_EMAIL, and why a login may fail. */
function recoveryCheckLogin() {
  const email = String(RECOVERY_EMAIL).trim().toLowerCase();
  const u = liveRows_('MST_USER').find(function (r) { return String(r.EMAIL).trim().toLowerCase() === email; });
  const out = [];
  if (!u) { Logger.log('✖ No user with email ' + email); return; }
  out.push('User: ' + u.USER_ID + ' · ' + u.FULL_NAME + ' · role ' + u.ROLE + ' · status ' + u.STATUS);
  if (blank_(u.PASSWORD_HASH) || blank_(u.PASSWORD_SALT)) out.push('✖ No password stored – run recoverySetPassword.');
  else if (String(u.PASSWORD_HASH).length !== 44) out.push('✖ PASSWORD_HASH was edited by hand (not a valid hash) – run recoverySetPassword.');
  else if (RECOVERY_PASSWORD) out.push(hashPassword_(RECOVERY_PASSWORD, u.PASSWORD_SALT) === u.PASSWORD_HASH ? '✔ Password is CORRECT.' : '✖ Password is WRONG.');
  if (String(u.STATUS).toUpperCase() !== 'ACTIVE') out.push('✖ Status is ' + u.STATUS + ' – must be ACTIVE to log in.');
  const fails = Number(CacheService.getScriptCache().get('F:' + email) || 0);
  if (fails >= MAX_LOGIN_FAILS) out.push('✖ Locked after ' + fails + ' wrong attempts (15 min) – recoverySetPassword also unlocks.');
  else if (fails) out.push('… ' + fails + ' wrong attempt(s) recorded.');
  Logger.log(out.join('\n'));
}
