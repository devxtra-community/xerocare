/**
 * Resolves a stored file URL to something a browser can actually load.
 *
 * Two classes of broken values exist in the data:
 *  - URLs built from the private R2 S3-API endpoint
 *    (`<account>.r2.cloudflarestorage.com/<bucket>/<key>`), which require SigV4
 *    auth and therefore always 401 in an <img>.
 *  - URLs pointing at a previous bucket's public hostname, dead since the
 *    bucket was swapped to xerocare-1.
 *
 * Both carry the correct object key, so we re-point them at the current public
 * bucket URL. Snapshot copies of product images live in billing metadata too,
 * which is why this runs on render rather than only being fixed by a backfill.
 */

const PUBLIC_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/+$/, '');
const BUCKET = process.env.NEXT_PUBLIC_R2_BUCKET || 'xerocare-1';

const isR2Host = (hostname: string) =>
  hostname.endsWith('.r2.dev') || hostname.endsWith('.r2.cloudflarestorage.com');

export function resolveImageUrl(value?: string | null): string {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  // data:/blob: previews from a local file picker are already loadable
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;

  if (!/^https?:\/\//i.test(raw)) {
    return PUBLIC_BASE ? `${PUBLIC_BASE}/${raw.replace(/^\/+/, '')}` : raw;
  }

  try {
    const url = new URL(raw);
    // A pre-signed link is already valid and its signature covers the exact
    // host and path — rewriting it would invalidate it.
    if (url.searchParams.has('X-Amz-Signature')) return raw;
    if (!isR2Host(url.hostname) || !PUBLIC_BASE) return raw;

    const segments = url.pathname.replace(/^\/+/, '').split('/');
    // Path-style S3 URLs lead with the bucket name; public URLs do not.
    if (segments[0] === BUCKET) segments.shift();
    const key = segments.join('/');
    if (!key) return raw;

    return `${PUBLIC_BASE}/${key}`;
  } catch {
    return raw;
  }
}
