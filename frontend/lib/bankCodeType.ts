/**
 * Country-correct bank identifier classification.
 *
 * "IFSC" is India-only. Every other country either uses IBAN (the real,
 * finite, publicly-registered ISO 13616 list below — mostly Europe, the
 * Middle East, and a handful of others) or has no reachable, verifiable
 * public standard we can validate against from here (UK Sort Code, US
 * Routing Number, China's CNAPS, etc.) — those fall back to a generic
 * free-text "Bank Code" field rather than guessing a format we can't
 * confirm is correct. SWIFT/BIC is a separate, always-available field
 * (international-wire identifier, independent of the domestic code) —
 * not part of this classification.
 */

export type BankCodeType = 'IFSC' | 'IBAN' | 'GENERIC';

/**
 * ISO 13616 IBAN registry: country code -> exact IBAN length. Real, stable,
 * publicly documented data (SWIFT/IBAN registry) — not a guess.
 */
export const IBAN_COUNTRY_LENGTHS: Record<string, number> = {
  AD: 24,
  AE: 23,
  AL: 28,
  AT: 20,
  AZ: 28,
  BA: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BR: 29,
  BY: 28,
  CH: 21,
  CR: 22,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  DO: 28,
  EE: 20,
  EG: 29,
  ES: 24,
  FI: 18,
  FO: 18,
  FR: 27,
  GB: 22,
  GE: 22,
  GI: 23,
  GL: 18,
  GR: 27,
  GT: 28,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IQ: 23,
  IS: 26,
  IT: 27,
  JO: 30,
  KW: 30,
  KZ: 20,
  LB: 28,
  LC: 32,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  LY: 25,
  MC: 27,
  MD: 24,
  ME: 22,
  MK: 19,
  MR: 27,
  MT: 31,
  MU: 30,
  NL: 18,
  NO: 15,
  OM: 23,
  PK: 24,
  PL: 28,
  PS: 29,
  PT: 25,
  QA: 29,
  RO: 24,
  RS: 22,
  SA: 24,
  SC: 31,
  SD: 18,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  ST: 25,
  SV: 28,
  TL: 23,
  TN: 24,
  TR: 26,
  UA: 29,
  VA: 22,
  VG: 24,
  XK: 20,
};

export function getBankCodeType(countryCode: string | null | undefined): BankCodeType {
  const cc = (countryCode || '').toUpperCase();
  if (cc === 'IN') return 'IFSC';
  if (IBAN_COUNTRY_LENGTHS[cc] !== undefined) return 'IBAN';
  return 'GENERIC';
}

export function getBankCodeLabel(countryCode: string | null | undefined): string {
  switch (getBankCodeType(countryCode)) {
    case 'IFSC':
      return 'IFSC Code';
    case 'IBAN':
      return 'IBAN';
    default:
      return 'Bank Code';
  }
}

export function getBankCodePlaceholder(countryCode: string | null | undefined): string {
  switch (getBankCodeType(countryCode)) {
    case 'IFSC':
      return 'e.g. SBIN0000001';
    case 'IBAN': {
      const len = IBAN_COUNTRY_LENGTHS[(countryCode || '').toUpperCase()];
      return `${len}-character IBAN`;
    }
    default:
      return 'Local bank/branch code (format not verified for this country)';
  }
}

/**
 * Validates a bank code against the format for the given country. GENERIC
 * codes are never rejected — we have no verified format to check them
 * against, so any non-empty value is accepted.
 */
export function validateBankCode(
  countryCode: string | null | undefined,
  code: string,
): { valid: boolean; message?: string } {
  const trimmed = code.trim().toUpperCase();
  const type = getBankCodeType(countryCode);

  if (type === 'IFSC') {
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(trimmed)) {
      return { valid: false, message: 'IFSC must be 4 letters + 0 + 6 alphanumeric characters' };
    }
    return { valid: true };
  }

  if (type === 'IBAN') {
    const cc = (countryCode || '').toUpperCase();
    const expectedLen = IBAN_COUNTRY_LENGTHS[cc];
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(trimmed)) {
      return { valid: false, message: 'IBAN must start with 2 letters + 2 check digits' };
    }
    if (!trimmed.startsWith(cc)) {
      return { valid: false, message: `IBAN must start with ${cc} for this bank country` };
    }
    if (expectedLen && trimmed.length !== expectedLen) {
      return { valid: false, message: `${cc} IBANs are ${expectedLen} characters long` };
    }
    return { valid: true };
  }

  return { valid: true };
}
