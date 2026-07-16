export interface CreatePurchaseDto {
  lotId: string;
  documentationFee: number;
  labourCost: number;
  handlingFee: number;
  transportationCost: number;
  shippingCost: number;
  groundfieldCost: number;
  createdBy?: string;
  // Tax fields (optional — resolved from branch/vendor at creation if not provided)
  taxPercent?: number;
  taxName?: string;
  purchaseCategory?: 'PRODUCT' | 'SPARE_PART' | 'SERVICE' | 'OTHER';
  importInvoiceNo?: string;
  customsEntryNo?: string;
  customsDuty?: number;
  goodsOrService?: 'GOODS' | 'SERVICE';
  vatClaimable?: boolean;
}

export interface AddPaymentDto {
  amount: number;
  paymentMethod: string;
  description?: string;
  referenceNumber?: string;
  paymentDate?: Date;
  createdBy?: string;
  attachmentUrl?: string;
  paidFromAccountId?: string;
}

export interface AddCostDto {
  amount: number;
  costType: string;
  description?: string;
  costDate?: Date;
  createdBy?: string;
}

export enum PurchaseStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}
