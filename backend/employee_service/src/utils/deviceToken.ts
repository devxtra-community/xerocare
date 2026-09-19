import crypto from 'crypto';

/**
 * The raw token lives in the browser cookie; only its hash is ever stored or
 * looked up server-side, so a DB read alone can't reconstruct a valid cookie.
 */
export function hashDeviceToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
