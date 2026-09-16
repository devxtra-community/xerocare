import { logger } from '../config/logger';

/**
 * The base URL every customer-facing link is built from — contract signing, bill approval,
 * installation sign-off, replacement approval.
 *
 * This must be the address a CUSTOMER can reach, which is not the address staff use. A
 * link is generated on a staff machine, emailed, and opened hours later on somebody's
 * phone: `localhost` is correct for nobody but the machine that produced it, and the
 * failure is completely silent — the link looks normal in the UI, in the email, and only
 * dies in the customer's browser.
 *
 * There were three copies of this resolver (two in this service, one in ven_inv), each
 * with its own fallback. One of them being wrong was enough to send a broken link, so
 * they are consolidated here.
 */
function resolveBase(): string {
  const base = process.env.PUBLIC_APP_URL?.trim();
  if (base) return base.replace(/\/+$/, '');
  logger.error(
    'PUBLIC_APP_URL is not set — customer-facing links would fall back to localhost, which ' +
      'is unreachable from anywhere but this machine. Set PUBLIC_APP_URL to the public ' +
      'application address (e.g. http://15.252.52.227).',
  );
  return '';
}

/**
 * True when no usable public address is configured.
 *
 * Callers use this to refuse rather than hand back a link that cannot work. Returning a
 * localhost URL "so something is shown" is what let this ship broken repeatedly — the
 * caller has no way to tell a good link from a dead one.
 */
export function isPublicAppUrlConfigured(): boolean {
  return !!process.env.PUBLIC_APP_URL?.trim();
}

/** Bare origin, no trailing slash. Empty when unconfigured — check before using. */
export function publicAppUrl(): string {
  return resolveBase();
}

/**
 * Full customer-facing link for a signing/approval path.
 *
 * Returns null when there is no public address configured, so the endpoint can answer with
 * a real error instead of a link to nowhere.
 */
export function publicAppLink(path: string): string | null {
  const base = resolveBase();
  if (!base) return null;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
