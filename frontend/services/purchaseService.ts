import api from '@/lib/api';

export interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  paymentDate: string;
  description?: string;
}

export interface Purchase {
  id: string;
  purchaseAmount: number;
  documentationFee: number;
  labourCost: number;
  handlingFee: number;
  transportationCost: number;
  shippingCost: number;
  groundfieldCost: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  lotId: string;
  vendorId: string;
  branchId: string;
  createdBy: string;
  createdAt: string;
  payments?: Payment[];
  vendor?: {
    id: string;
    name: string;
  };
  lot?: {
    id: string;
    lot_number?: string;
  };
}

export interface AddPaymentDto {
  amount: number;
  paymentMethod: string;
  description?: string;
  referenceNumber?: string;
  paymentDate?: string;
}

export interface CreatePurchaseDTO {
  lotId: string;
  documentationFee: number;
  labourCost: number;
  handlingFee: number;
  transportationCost: number;
  shippingCost: number;
  groundfieldCost: number;
}

export type UpdatePurchaseDTO = Partial<CreatePurchaseDTO>;

export const purchaseService = {
  /**
   * Retrieves all purchases.
   */
  getAllPurchases: async (): Promise<Purchase[]> => {
    const response = await api.get('/i/purchases');
    return response.data.data;
  },

  /**
   * Retrieves a purchase by ID.
   */
  getPurchaseById: async (id: string): Promise<Purchase> => {
    const response = await api.get(`/i/purchases/${id}`);
    return response.data.data;
  },

  /**
   * Retrieves a purchase by Lot ID.
   */
  getPurchaseByLotId: async (lotId: string): Promise<Purchase | null> => {
    const response = await api.get(`/i/purchases/lot/${lotId}`);
    return response.data.data;
  },

  /**
   * Creates a new purchase.
   */
  createPurchase: async (data: CreatePurchaseDTO): Promise<Purchase> => {
    const response = await api.post('/i/purchases', data);
    return response.data.data;
  },

  /**
   * Updates an existing purchase.
   */
  updatePurchase: async (id: string, data: UpdatePurchaseDTO): Promise<Purchase> => {
    const response = await api.patch(`/i/purchases/${id}`, data);
    return response.data.data;
  },

  /**
   * Deletes a purchase.
   */
  deletePurchase: async (id: string): Promise<void> => {
    await api.delete(`/i/purchases/${id}`);
  },

  /**
   * Adds a payment to a purchase.
   */
  addPayment: async (purchaseId: string, data: AddPaymentDto): Promise<Payment> => {
    const response = await api.post(`/i/purchases/${purchaseId}/payments`, data);
    return response.data.data;
  },
};
