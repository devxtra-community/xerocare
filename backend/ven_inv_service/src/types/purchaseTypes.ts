export interface CreatePurchaseDto {
  lotId: string;
  documentationFee: number;
  labourCost: number;
  handlingFee: number;
  transportationCost: number;
  shippingCost: number;
  groundfieldCost: number;
  createdBy?: string;
}

export interface AddPaymentDto {
  amount: number;
  paymentMethod: string;
  description?: string;
  referenceNumber?: string;
  paymentDate?: Date;
  createdBy?: string;
}

export enum PurchaseStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
}
