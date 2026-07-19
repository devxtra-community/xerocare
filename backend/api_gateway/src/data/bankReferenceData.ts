/**
 * Static, curated bank-name reference data for countries where no free/open
 * branch-level dataset exists (UAE, Saudi Arabia, Qatar, Pakistan — verified via
 * each country's central bank public list of licensed banks). Branch is free text
 * for these countries.
 *
 * India is handled separately (see bankReferenceController.ts) via a live IFSC
 * lookup against a real public API, since a genuine free, comprehensive,
 * branch-level dataset does exist for India (RBI's IFSC system) — unlike the
 * other four countries, where no equivalent exists.
 *
 * Countries not listed here fall back to free-text bank name entry entirely.
 */

export const BANKS_BY_COUNTRY: Record<string, string[]> = {
  // UAE — per Central Bank of the UAE's public list of licensed banks
  AE: [
    'Emirates NBD',
    'First Abu Dhabi Bank (FAB)',
    'Abu Dhabi Commercial Bank (ADCB)',
    'Dubai Islamic Bank',
    'Mashreq Bank',
    'Abu Dhabi Islamic Bank (ADIB)',
    'RAKBANK (National Bank of Ras Al Khaimah)',
    'Commercial Bank of Dubai (CBD)',
    'Sharjah Islamic Bank',
    'National Bank of Fujairah (NBF)',
    'Ajman Bank',
    'Bank of Sharjah',
    'United Arab Bank',
    'Invest Bank',
    'Emirates Islamic Bank',
    'Standard Chartered (UAE)',
    'HSBC (UAE)',
    'Citibank (UAE)',
  ],
  // Saudi Arabia — per SAMA's public list of licensed banks
  SA: [
    'Saudi National Bank (SNB)',
    'Al Rajhi Bank',
    'Riyad Bank',
    'Banque Saudi Fransi',
    'Saudi British Bank (SABB)',
    'Arab National Bank (ANB)',
    'Bank AlJazira',
    'Bank Albilad',
    'Alinma Bank',
    'Saudi Investment Bank (SAIB)',
    'Gulf International Bank Saudi Arabia',
  ],
  // Qatar — per Qatar Central Bank's public list of licensed banks
  QA: [
    'Qatar National Bank (QNB)',
    'Commercial Bank of Qatar',
    'Doha Bank',
    'Qatar Islamic Bank (QIB)',
    'Ahli Bank Qatar',
    'Dukhan Bank',
    'Qatar International Islamic Bank (QIIB)',
    'Masraf Al Rayan',
    'HSBC Qatar',
    'Standard Chartered Qatar',
  ],
  // Pakistan — per State Bank of Pakistan's public list of scheduled banks
  PK: [
    'Habib Bank Limited (HBL)',
    'United Bank Limited (UBL)',
    'MCB Bank',
    'Allied Bank Limited (ABL)',
    'National Bank of Pakistan (NBP)',
    'Bank Alfalah',
    'Askari Bank',
    'Faysal Bank',
    'Meezan Bank',
    'Standard Chartered Pakistan',
    'Bank Al Habib',
    'Soneri Bank',
    'JS Bank',
    'Summit Bank',
    'Silk Bank',
    'The Bank of Punjab',
    'The Bank of Khyber',
  ],
  // India — bank NAME list for the dropdown; BRANCH is verified live via IFSC
  // code lookup (see bankReferenceController.ts), not from this static list.
  IN: [
    'State Bank of India (SBI)',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'Kotak Mahindra Bank',
    'Punjab National Bank (PNB)',
    'Bank of Baroda',
    'Canara Bank',
    'Union Bank of India',
    'IndusInd Bank',
    'Yes Bank',
    'IDFC First Bank',
    'Bank of India',
    'Central Bank of India',
    'Indian Bank',
    'Indian Overseas Bank',
    'UCO Bank',
    'Punjab & Sind Bank',
    'Federal Bank',
    'South Indian Bank',
    'RBL Bank',
    'Karur Vysya Bank',
    'City Union Bank',
    'DCB Bank',
    'Bandhan Bank',
    'IDBI Bank',
    'AU Small Finance Bank',
    'Equitas Small Finance Bank',
  ],
};

/** Countries with a real dataset (India = live IFSC; others = curated bank list). */
export const BANK_REFERENCE_COUNTRIES = Object.keys(BANKS_BY_COUNTRY);

export function getBanksForCountry(countryIso2: string): string[] | null {
  return BANKS_BY_COUNTRY[countryIso2.toUpperCase()] ?? null;
}
