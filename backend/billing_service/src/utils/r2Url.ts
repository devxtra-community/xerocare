/**
 * R2 URL helpers.
 *
 * The bucket is organised by prefix: `products/` and `spare-parts/` are public
 * (served straight off the bucket's public URL), everything else is private and
 * must be handed out as a short-lived pre-signed URL instead.
 *
 * `file.location` from multer-s3 is NOT usable here — it points at the private
 * S3 API endpoint (`<account>.r2.cloudflarestorage.com/<bucket>/<key>`), which
 * needs SigV4 auth on every GET, so a browser <img> always fails on it. Build
 * public links from the key + R2_PUBLIC_URL instead.
 */

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2 } from '../config/r2';
import { logger } from '../config/logger';

/** Prefixes whose objects are readable without a signature. */
export const PUBLIC_PREFIXES = ['products/', 'spare-parts/'] as const;

const publicBase = () => (process.env.R2_PUBLIC_URL || '').replace(/\/+$/, '');

/** Percent-encodes each path segment; keys routinely contain spaces. */
const encodeKey = (key: string) =>
  key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

export const isPublicKey = (key: string) => PUBLIC_PREFIXES.some((p) => key.startsWith(p));

/**
 * Pulls the object key out of anything we may have stored historically:
 * a public URL, the private S3-API URL, or an already-bare key.
 */
export function extractR2Key(urlOrKey?: string | null): string | undefined {
  if (!urlOrKey) return undefined;
  const value = String(urlOrKey).trim();
  if (!value) return undefined;

  if (!/^https?:\/\//i.test(value)) {
    return decodeURIComponent(value.replace(/^\/+/, ''));
  }

  try {
    const { pathname } = new URL(value);
    const segments = pathname.replace(/^\/+/, '').split('/');
    // The private S3-API URL is path-style, so the bucket name leads the path.
    if (segments[0] === process.env.R2_BUCKET) segments.shift();
    return decodeURIComponent(segments.join('/'));
  } catch {
    return undefined;
  }
}

/** Builds the public URL for a key. Returns undefined when R2_PUBLIC_URL is unset. */
export function r2PublicUrl(key?: string | null): string | undefined {
  if (!key) return undefined;
  const base = publicBase();
  if (!base) return undefined;
  return `${base}/${encodeKey(key)}`;
}

/**
 * Re-points a stored value at the current public bucket URL. Legacy rows hold
 * URLs from the previous bucket (or the private endpoint), so read paths run
 * values through this before returning them.
 */
export function normalizePublicUrl(urlOrKey?: string | null): string | undefined {
  const key = extractR2Key(urlOrKey);
  return key ? r2PublicUrl(key) : undefined;
}

/**
 * Default lifetime for a signed link. Long enough that images embedded in a
 * dashboard left open (profile photos, product shots) don't rot mid-session,
 * short enough that a leaked link expires the same working day.
 */
const SIGNED_URL_TTL = 60 * 60 * 6;

/**
 * Whether R2_PUBLIC_URL actually serves this bucket.
 *
 * Swapping the bucket without updating R2_PUBLIC_URL leaves every public link
 * pointing at a hostname that 404s, which is invisible server-side. Probe once
 * per process with a key we know exists; if the public host does not serve it,
 * fall back to signed links instead of handing out dead URLs.
 */
let publicBaseUsable: Promise<boolean> | undefined;

const probePublicBase = async (knownKey: string): Promise<boolean> => {
  const url = r2PublicUrl(knownKey);
  if (!url) return false;
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) return true;
    logger.error(
      `R2_PUBLIC_URL (${publicBase()}) returned ${response.status} for an object that exists in ` +
        `bucket ${process.env.R2_BUCKET}. Falling back to signed URLs — update R2_PUBLIC_URL to ` +
        `this bucket's public development URL.`,
    );
    return false;
  } catch (error) {
    logger.error('R2 public URL probe failed, falling back to signed URLs', error);
    return false;
  }
};

/**
 * Link for displaying a stored file: a public link when the bucket serves one,
 * a short-lived signed link otherwise. Accepts a bare key or any legacy stored
 * URL, so rows written before keys were stored keep working.
 */
export async function r2SignedGetUrl(
  urlOrKey?: string | null,
  expiresIn = SIGNED_URL_TTL,
): Promise<string | undefined> {
  const key = extractR2Key(urlOrKey);
  if (!key) return undefined;
  // Public-prefix objects only get a plain link when a public base is actually
  // configured and verified; otherwise sign, so images still load while the
  // bucket's public URL is unset, wrong, or being re-pointed.
  if (isPublicKey(key) && publicBase()) {
    publicBaseUsable ??= probePublicBase(key);
    if (await publicBaseUsable) return r2PublicUrl(key);
  }

  return getSignedUrl(r2, new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }), {
    expiresIn,
  });
}

/**
 * The URL a client should use to display a stored file — public link for public
 * prefixes, signed link otherwise. Accepts legacy URLs from the old bucket.
 */
export const r2ViewUrl = r2SignedGetUrl;

/**
 * Signed PUT link so the browser can upload straight to R2 (needs a CORS rule
 * on the bucket allowing PUT from the app origin).
 */
export async function r2SignedPutUrl(
  key: string,
  contentType?: string,
  expiresIn = SIGNED_URL_TTL,
): Promise<string> {
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

/** Builds a collision-safe key inside a folder, preserving the original name. */
export function buildR2Key(folder: string, originalName: string): string {
  const safeName = originalName.replace(/[^\w.\-() ]+/g, '_');
  return `${folder.replace(/^\/+|\/+$/g, '')}/${Date.now()}-${safeName}`;
}
