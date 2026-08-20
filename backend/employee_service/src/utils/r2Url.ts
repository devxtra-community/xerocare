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

/** Default lifetime for a signed link — long enough to open, short enough not to leak. */
const SIGNED_URL_TTL = 60 * 15;

/**
 * Signed GET link for a private object. Accepts a bare key or any legacy stored
 * URL, so rows written before keys were stored keep working.
 */
export async function r2SignedGetUrl(
  urlOrKey?: string | null,
  expiresIn = SIGNED_URL_TTL,
): Promise<string | undefined> {
  const key = extractR2Key(urlOrKey);
  if (!key) return undefined;
  if (isPublicKey(key)) return r2PublicUrl(key);

  return getSignedUrl(r2, new GetObjectCommand({ Bucket: process.env.R2_BUCKET!, Key: key }), {
    expiresIn,
  });
}

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
