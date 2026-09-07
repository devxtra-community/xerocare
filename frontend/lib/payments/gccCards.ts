/**
 * GCC issuer master for the Online Payment selector.
 *
 * Each entry is structured data, not a display string: country, bank, card type and
 * network are stored separately so reporting can group by any of them. The label is
 * derived for display only — deriving it the other way (parsing "Emirates NBD Visa
 * Debit" back into its parts) is what makes card reporting unqueryable.
 *
 * This list is a convenience catalogue of who issues cards. It says nothing whatsoever
 * about what any bank charges: processing rates come from the merchant's own configured
 * agreement (card_processing_fee_rules), never from this file.
 */

export type CardType = 'DEBIT' | 'CREDIT';
export type CardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'UNIONPAY' | 'MADA' | 'KNET' | 'OTHER';
export type IssuerCountryCode = 'AE' | 'SA' | 'QA' | 'KW' | 'OM' | 'BH';

export interface GccCountry {
  code: IssuerCountryCode;
  name: string;
  currency: string;
}

/** One country, one entry — a bank never appears under two countries. */
export const GCC_COUNTRIES: GccCountry[] = [
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
  { code: 'QA', name: 'Qatar', currency: 'QAR' },
  { code: 'KW', name: 'Kuwait', currency: 'KWD' },
  { code: 'OM', name: 'Oman', currency: 'OMR' },
  { code: 'BH', name: 'Bahrain', currency: 'BHD' },
];

export interface CardOption {
  /** Stable id, used as the select value. */
  id: string;
  country: IssuerCountryCode;
  issuerBank: string;
  cardType: CardType;
  /**
   * The network this option settles on. When a bank issues on more than one network the
   * entry lists them and the user picks — the UI only asks when it is genuinely
   * ambiguous, and auto-fills when it is not.
   */
  networks: CardNetwork[];
  label: string;
}

const opt = (
  country: IssuerCountryCode,
  issuerBank: string,
  cardType: CardType,
  networks: CardNetwork[],
  label: string,
): CardOption => ({
  id: `${country}-${issuerBank}-${cardType}`.replace(/\s+/g, '_').toUpperCase(),
  country,
  issuerBank,
  cardType,
  networks,
  label,
});

export const DEBIT_CARDS: CardOption[] = [
  // UAE
  opt('AE', 'Emirates NBD', 'DEBIT', ['VISA'], 'Emirates NBD Visa Debit'),
  opt('AE', 'ADCB', 'DEBIT', ['VISA'], 'ADCB Visa Debit'),
  opt('AE', 'FAB', 'DEBIT', ['VISA'], 'FAB Visa Debit'),
  opt('AE', 'Mashreq', 'DEBIT', ['VISA'], 'Mashreq Visa Debit'),
  opt('AE', 'Dubai Islamic Bank', 'DEBIT', ['VISA'], 'Dubai Islamic Bank Visa Debit'),
  opt('AE', 'Emirates Islamic', 'DEBIT', ['VISA'], 'Emirates Islamic Visa Debit'),
  // Saudi Arabia — domestic debit runs on Mada
  opt('SA', 'Al Rajhi Bank', 'DEBIT', ['MADA'], 'Al Rajhi Mada Debit'),
  opt('SA', 'SNB', 'DEBIT', ['MADA'], 'SNB Mada Debit'),
  opt('SA', 'Riyad Bank', 'DEBIT', ['MADA'], 'Riyad Bank Mada Debit'),
  opt('SA', 'Alinma Bank', 'DEBIT', ['MADA'], 'Alinma Mada Debit'),
  opt('SA', 'SAB', 'DEBIT', ['MADA'], 'SAB Mada Debit'),
  // Qatar
  opt('QA', 'QNB', 'DEBIT', ['VISA'], 'QNB Visa Debit'),
  opt('QA', 'Doha Bank', 'DEBIT', ['VISA'], 'Doha Bank Visa Debit'),
  opt('QA', 'Commercial Bank of Qatar', 'DEBIT', ['VISA'], 'Commercial Bank Qatar Visa Debit'),
  opt('QA', 'Dukhan Bank', 'DEBIT', ['VISA', 'MASTERCARD'], 'Dukhan Bank Debit'),
  opt('QA', 'QIB', 'DEBIT', ['VISA'], 'QIB Visa Debit'),
  // Kuwait — domestic debit runs on KNET
  opt('KW', 'KFH', 'DEBIT', ['KNET'], 'KFH KNET Debit'),
  opt('KW', 'NBK', 'DEBIT', ['VISA', 'KNET'], 'NBK Visa Debit'),
  opt('KW', 'Gulf Bank', 'DEBIT', ['VISA', 'KNET'], 'Gulf Bank Visa Debit'),
  opt('KW', 'Boubyan Bank', 'DEBIT', ['KNET'], 'Boubyan Debit'),
  opt('KW', 'Burgan Bank', 'DEBIT', ['KNET'], 'Burgan Bank Debit'),
  // Oman
  opt('OM', 'Bank Muscat', 'DEBIT', ['VISA'], 'Bank Muscat Visa Debit'),
  opt('OM', 'NBO', 'DEBIT', ['VISA'], 'NBO Visa Debit'),
  opt('OM', 'BankDhofar', 'DEBIT', ['VISA'], 'BankDhofar Visa Debit'),
  opt('OM', 'Sohar International', 'DEBIT', ['VISA', 'MASTERCARD'], 'Sohar International Debit'),
  // Bahrain
  opt('BH', 'BBK', 'DEBIT', ['VISA'], 'BBK Visa Debit'),
  opt('BH', 'NBB', 'DEBIT', ['VISA'], 'NBB Visa Debit'),
  opt('BH', 'ila Bank', 'DEBIT', ['VISA', 'MASTERCARD'], 'ila Debit Card'),
  opt('BH', 'BisB', 'DEBIT', ['VISA', 'MASTERCARD'], 'BisB Debit Card'),
];

export const CREDIT_CARDS: CardOption[] = [
  // UAE
  opt(
    'AE',
    'Emirates NBD',
    'CREDIT',
    ['VISA', 'MASTERCARD'],
    'Emirates NBD Visa / Mastercard Credit Card',
  ),
  opt('AE', 'ADCB', 'CREDIT', ['VISA'], 'ADCB Visa Credit Card'),
  opt('AE', 'FAB', 'CREDIT', ['VISA', 'MASTERCARD'], 'FAB Visa / Mastercard Credit Card'),
  opt('AE', 'Mashreq', 'CREDIT', ['VISA', 'MASTERCARD'], 'Mashreq Credit Card'),
  opt(
    'AE',
    'Dubai Islamic Bank',
    'CREDIT',
    ['VISA', 'MASTERCARD'],
    'Dubai Islamic Bank Credit Card',
  ),
  opt('AE', 'Emirates Islamic', 'CREDIT', ['VISA', 'MASTERCARD'], 'Emirates Islamic Credit Card'),
  opt('AE', 'HSBC UAE', 'CREDIT', ['VISA', 'MASTERCARD'], 'HSBC UAE Credit Card'),
  opt('AE', 'Citi UAE', 'CREDIT', ['VISA', 'MASTERCARD', 'AMEX'], 'Citi UAE Credit Card'),
  // Saudi Arabia
  opt(
    'SA',
    'Al Rajhi Bank',
    'CREDIT',
    ['VISA', 'MASTERCARD'],
    'Al Rajhi Visa / Mastercard Credit Card',
  ),
  opt('SA', 'SNB', 'CREDIT', ['VISA', 'MASTERCARD'], 'SNB Credit Card'),
  opt('SA', 'Riyad Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'Riyad Bank Credit Card'),
  opt('SA', 'Alinma Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'Alinma Credit Card'),
  opt('SA', 'SAB', 'CREDIT', ['VISA', 'MASTERCARD'], 'SAB Credit Card'),
  opt('SA', 'BSF', 'CREDIT', ['VISA', 'MASTERCARD'], 'BSF Credit Card'),
  // Qatar
  opt('QA', 'QNB', 'CREDIT', ['VISA', 'MASTERCARD'], 'QNB Visa / Mastercard Credit Card'),
  opt('QA', 'Doha Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'Doha Bank Credit Card'),
  opt(
    'QA',
    'Commercial Bank of Qatar',
    'CREDIT',
    ['VISA', 'MASTERCARD'],
    'Commercial Bank Qatar Credit Card',
  ),
  opt('QA', 'QIB', 'CREDIT', ['VISA', 'MASTERCARD'], 'QIB Credit Card'),
  opt('QA', 'Dukhan Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'Dukhan Credit Card'),
  // Kuwait
  opt('KW', 'NBK', 'CREDIT', ['VISA', 'MASTERCARD'], 'NBK Visa / Mastercard Credit Card'),
  opt('KW', 'KFH', 'CREDIT', ['VISA', 'MASTERCARD'], 'KFH Credit Card'),
  opt('KW', 'Gulf Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'Gulf Bank Credit Card'),
  opt('KW', 'Boubyan Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'Boubyan Bank Credit Card'),
  opt('KW', 'Burgan Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'Burgan Bank Credit Card'),
  // Oman
  opt('OM', 'Bank Muscat', 'CREDIT', ['VISA', 'MASTERCARD'], 'Bank Muscat Credit Card'),
  opt('OM', 'NBO', 'CREDIT', ['VISA', 'MASTERCARD'], 'NBO Credit Card'),
  opt('OM', 'BankDhofar', 'CREDIT', ['VISA', 'MASTERCARD'], 'BankDhofar Credit Card'),
  opt(
    'OM',
    'Sohar International',
    'CREDIT',
    ['VISA', 'MASTERCARD'],
    'Sohar International Credit Card',
  ),
  opt('OM', 'Ahlibank Oman', 'CREDIT', ['VISA', 'MASTERCARD'], 'Ahlibank Oman Credit Card'),
  // Bahrain
  opt('BH', 'BBK', 'CREDIT', ['VISA', 'MASTERCARD'], 'BBK Credit Card'),
  opt('BH', 'NBB', 'CREDIT', ['VISA', 'MASTERCARD'], 'NBB Credit Card'),
  opt('BH', 'ila Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'ila Credit Card'),
  opt('BH', 'BisB', 'CREDIT', ['VISA', 'MASTERCARD'], 'BisB Credit Card'),
  opt('BH', 'Ahli United Bank', 'CREDIT', ['VISA', 'MASTERCARD'], 'Ahli United Bank Credit Card'),
];

export function cardOptionsFor(cardType: CardType): CardOption[] {
  return cardType === 'DEBIT' ? DEBIT_CARDS : CREDIT_CARDS;
}

export const CARD_NETWORK_LABEL: Record<CardNetwork, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMEX: 'American Express',
  UNIONPAY: 'UnionPay',
  MADA: 'Mada',
  KNET: 'KNET',
  OTHER: 'Other',
};

export function countryName(code: string): string {
  return GCC_COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/**
 * Everything a user might reasonably type to find a card: bank, country (code and
 * name), type and every network it settles on. Without this, searching "Mada" or
 * "Saudi" or "Visa" finds nothing, because none of those words is in the bank's name.
 */
export function cardSearchText(o: CardOption): string {
  return [
    o.issuerBank,
    o.label,
    o.country,
    countryName(o.country),
    o.cardType,
    o.cardType === 'DEBIT' ? 'debit' : 'credit',
    ...o.networks,
    ...o.networks.map((n) => CARD_NETWORK_LABEL[n]),
  ].join(' ');
}

// ─── PAN handling ────────────────────────────────────────────────────────────
// The card number is entered so the salesperson can confirm the card in front of them,
// and is then reduced to four digits. It is never put into state that gets submitted,
// never logged, and never sent to the server.

/** Digits only — what validation and last-4 extraction operate on. */
export const panDigits = (raw: string): string => raw.replace(/\D+/g, '');

/** Groups digits for readability while typing: 4242 4242 4242 4242. */
export function formatPanForDisplay(raw: string): string {
  const d = panDigits(raw).slice(0, 19);
  return d.replace(/(.{4})/g, '$1 ').trim();
}

/** Masked form shown after entry: every digit but the final four. */
export function maskPan(raw: string): string {
  const d = panDigits(raw);
  if (d.length < 4) return '•'.repeat(d.length);
  return '*'.repeat(d.length - 4) + d.slice(-4);
}

export const last4 = (raw: string): string => panDigits(raw).slice(-4);

/** Luhn check digit — catches transposed/mistyped numbers before they reach the gateway. */
export function luhnValid(raw: string): boolean {
  const d = panDigits(raw);
  if (d.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let digit = d.charCodeAt(i) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Amex is 15 digits, UnionPay runs to 19; most others are 16. */
export function panLengthValid(raw: string, network?: CardNetwork): boolean {
  const len = panDigits(raw).length;
  if (network === 'AMEX') return len === 15;
  if (network === 'UNIONPAY') return len >= 16 && len <= 19;
  return len >= 16 && len <= 19;
}
