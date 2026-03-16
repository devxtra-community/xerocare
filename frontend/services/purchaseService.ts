import api from '@/lib/api';
import { Lot, Vendor } from '@/lib/lot';
import { Branch } from '@/lib/branch';

/**
 * Record of a single payment made towards a purchase.
 */
export interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  paymentDate: string;
  description?: string;
}

/**
 * Details of a bulk purchase made from a vendor.
 */
export interface Purchase {
  id: string;
  purchaseAmount: number;
  documentationFee: number; // Cost for processing paperwork
  labourCost: number; // Cost for workers involved in the purchase
  handlingFee: number; // Fees for moving and managing items
  transportationCost: number; // Cost for moving goods locally
  shippingCost: number; // Cost for international or long-distance shipping
  groundfieldCost: number; // Fees for storage or inspection area usage
  totalAmount: number; // Total cost (purchase + all fees)
  paidAmount: number; // How much money we have already sent
  remainingAmount: number; // Money we still owe the vendor
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  lotId: string; // The group of items (Lot) this purchase is for
  vendorId: string;
  branchId: string;
  createdBy: string;
  createdAt: string;
  lot?: Lot;
  vendor?: Vendor;
  branch?: Branch;
  payments?: Payment[];
}

/**
 * Information needed to record a new payment.
 */
export interface AddPaymentDto {
  amount: number;
  paymentMethod: string;
  description?: string;
  referenceNumber?: string;
  paymentDate?: string;
}

/**
 * Details needed to record a brand new bulk purchase.
 */
export interface CreatePurchaseDTO {
  lotId: string;
  documentationFee: number;
  labourCost: number;
  handlingFee: number;
  transportationCost: number;
  shippingCost: number;
  groundfieldCost: number;
}

/**
 * Information needed to update an existing purchase.
 */
export type UpdatePurchaseDTO = Partial<CreatePurchaseDTO>;

/**
 * The Purchase Service manages the records of product shipments we buy
 * from vendors and tracks how much we owe vs how much we've paid.
 */
export const purchaseService = {
  /**
   * Get a list of all historical and current purchases.
   */
  getAllPurchases: async (): Promise<Purchase[]> => {
    const response = await api.get('/i/purchases');
    return response.data.data;
  },

  /**
   * Look up the full details and payment history for one purchase.
   */
  getPurchaseById: async (id: string): Promise<Purchase> => {
    const response = await api.get(`/i/purchases/${id}`);
    return response.data.data;
  },

  /**
   * Find the purchase record linked to a specific group of items (Lot).
   */
  getPurchaseByLotId: async (lotId: string): Promise<Purchase | null> => {
    const response = await api.get(`/i/purchases/lot/${lotId}`);
    return response.data.data;
  },

  /**
   * Record a new bulk purchase in the system.
   */
  createPurchase: async (data: CreatePurchaseDTO): Promise<Purchase> => {
    const response = await api.post('/i/purchases', data);
    return response.data.data;
  },

  /**
   * Change the fee or cost details for a purchase.
   */
  updatePurchase: async (id: string, data: UpdatePurchaseDTO): Promise<Purchase> => {
    const response = await api.patch(`/i/purchases/${id}`, data);
    return response.data.data;
  },

  /**
   * Remove a purchase record (Warning: This undoes the financial record).
   */
  deletePurchase: async (id: string): Promise<void> => {
    await api.delete(`/i/purchases/${id}`);
  },

  /**
   * Add a new payment (e.g., bank transfer, cash) against a purchase.
   */
  addPayment: async (purchaseId: string, data: AddPaymentDto): Promise<Payment> => {
    const response = await api.post(`/i/purchases/${purchaseId}/payments`, data);
    return response.data.data;
  },
};
