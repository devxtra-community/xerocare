import { CookieOptions } from 'express';

/**
 * Single source of truth for the refresh-token cookie attributes.
 *
 * Setting and clearing MUST agree: a browser only replaces/removes a cookie when
 * the name, path and domain all match, so keeping one definition here prevents
 * "logout doesn't actually log out" drift between `res.cookie` and
 * `res.clearCookie`.
 *
 * `secure` defaults to FALSE because this deployment is served over plain HTTP
 * (http://15.252.52.227). A Secure cookie is never sent over HTTP, so every
 * refresh arrived with no cookie and failed with "No refresh token", logging the
 * user straight back out. `sameSite: 'lax'` is required for the same reason:
 * `sameSite: 'none'` is only honoured alongside Secure, so the previous
 * production pairing (`none` + `secure`) meant the browser rejected the cookie
 * outright rather than merely withholding it.
 *
 * Once TLS is terminated in front of this service, set COOKIE_SECURE=true (and
 * only then) to harden it — no code change needed.
 */
const isSecure = process.env.COOKIE_SECURE === 'true';

export const REFRESH_COOKIE_NAME = 'refreshToken';

/**
 * 7 days. Deliberately shorter than the refresh JWT's own 15-day expiry
 * (see utils/jwt.ts) — a cookie that outlived its token would keep sending a
 * dead credential, so the shorter of the two wins.
 */
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isSecure,
  sameSite: 'lax',
  maxAge: REFRESH_COOKIE_MAX_AGE,
  path: '/',
};

/**
 * Options for clearing. Identical to the above minus `maxAge` — Express sets its
 * own expiry when clearing, and passing a future maxAge alongside it is
 * contradictory.
 */
export const clearCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isSecure,
  sameSite: 'lax',
  path: '/',
};
