/**
 * Base URL for customer-facing links (contract signing, bill approval, installation
 * sign-off) when the server has not supplied one.
 *
 * Order of preference:
 *  1. the `link` the API returns — the server knows its own PUBLIC_APP_URL, so that is
 *     always the most authoritative answer;
 *  2. `NEXT_PUBLIC_PUBLIC_APP_URL` — needed whenever the browser's address is NOT the
 *     address customers use. That is the normal case when staff work against a remote
 *     API from a local page, and it is exactly what made generated links say
 *     "localhost:3000" in a customer's inbox;
 *  3. the browser's own origin — correct only when staff and customers reach the app at
 *     the same address.
 *
 * Returns a bare origin with no trailing slash, so callers can append a path directly.
 */
export function publicAppBase(): string {
  const configured = process.env.NEXT_PUBLIC_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

/** Full customer-facing URL for a signing/approval path, e.g. `/public/bill/sign/<token>`. */
export function publicAppLink(path: string): string {
  return `${publicAppBase()}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * True when a customer-facing link points somewhere only this machine can reach.
 *
 * Worth showing in the UI rather than trusting configuration: when
 * NEXT_PUBLIC_PUBLIC_APP_URL is missing the fallback below produces a link that looks
 * completely normal and fails only once it is already in a customer's inbox. Both
 * halves of that failure are silent, which is how it survived several rounds of
 * "the link is still localhost".
 */
export function isUnreachableLink(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
  } catch {
    return false;
  }
}
