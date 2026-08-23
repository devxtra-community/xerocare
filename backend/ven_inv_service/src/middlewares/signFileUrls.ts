import { NextFunction, Request, Response } from 'express';
import { r2ViewUrl } from '../utils/r2Url';

/**
 * Turns stored file references into links a browser can actually open.
 *
 * Rows persist the R2 object key (older rows hold URLs from a previous bucket,
 * or the private S3-API endpoint — neither of which loads). Signing at each
 * serialization site meant every new endpoint was one forgotten line away from
 * shipping dead links, so responses are rewritten in one place instead.
 *
 * Only these field names are touched, and only string values.
 */
const FILE_FIELDS = new Set([
  'imageUrl',
  'image_url',
  'fileUrl',
  'file_url',
  'receiptUrl',
  'receipt_url',
  'attachmentUrl',
  'attachment_url',
  'proofUrl',
  'documentUrl',
  'customerSignedDocumentUrl',
  'meterImageUrl',
  'profileImageUrl',
  'profile_image_url',
  'idProofUrl',
]);

/** Guards against pathological payloads; real responses nest far shallower. */
const MAX_DEPTH = 8;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

async function rewrite(value: unknown, depth = 0): Promise<unknown> {
  if (depth > MAX_DEPTH || value === null || typeof value !== 'object') return value;

  // Date has no own enumerable properties, so walking it as a plain object below
  // collapses it to `{}`. Pass it through untouched so res.json's JSON.stringify
  // serializes it the normal way (via Date.prototype.toJSON -> ISO string).
  if (value instanceof Date) return value;

  if (Array.isArray(value)) {
    return Promise.all(value.map((entry) => rewrite(entry, depth + 1)));
  }

  if (!isPlainObject(value)) return value;

  const entries = await Promise.all(
    Object.entries(value).map(async ([key, entry]) => {
      if (FILE_FIELDS.has(key) && typeof entry === 'string' && entry.trim()) {
        return [key, (await r2ViewUrl(entry)) ?? entry] as const;
      }
      return [key, await rewrite(entry, depth + 1)] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export function signFileUrls(_req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    rewrite(body)
      .then((rewritten) => originalJson(rewritten))
      .catch(() => originalJson(body));
    return res;
  };

  next();
}
