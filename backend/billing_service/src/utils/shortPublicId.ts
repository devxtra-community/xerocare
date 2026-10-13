/** Compact a UUID for customer URLs without reducing its entropy. */
export function encodeShortPublicId(id: string): string {
  const hex = id.replace(/-/g, '');
  if (!/^[\da-f]{32}$/i.test(hex)) {
    throw new Error('Expected a UUID public link identifier');
  }
  return Buffer.from(hex, 'hex').toString('base64url');
}

/** Decode compact UUID links; accept UUIDs too so previously sent links keep working. */
export function decodeShortPublicId(value: string): string | null {
  if (/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)) return value;
  if (!/^[A-Za-z0-9_-]{22}$/.test(value)) return null;

  try {
    const bytes = Buffer.from(value, 'base64url');
    if (bytes.length !== 16 || bytes.toString('base64url') !== value) return null;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return null;
  }
}
