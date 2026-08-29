export enum ItemType {
  PRICING_RULE = 'PRICING_RULE',
  PRODUCT = 'PRODUCT',
  SPARE_PART = 'SPARE_PART',
  // A Rent/Lease accessory (stand, tray, stapler unit, etc.) supplied alongside the
  // metered machine — a real priced line item, billed once with the first month advance,
  // never metered. See EmployeeQuotationTable.tsx's "Accessories" section.
  ACCESSORY = 'ACCESSORY',
}
