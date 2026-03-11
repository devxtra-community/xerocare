export interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  paymentDate: string;
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
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  lotId: string;
  vendorId: string;
  branchId: string;
  createdBy: string;
  createdAt: string;
  payments?: Payment[];
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
    return [
      {
        id: '1',
        purchaseAmount: 14000,
        documentationFee: 500,
        labourCost: 200,
        handlingFee: 100,
        transportationCost: 100,
        shippingCost: 100,
        groundfieldCost: 0,
        totalAmount: 15000,
        status: 'PAID',
        lotId: 'lot-1',
        vendorId: 'v1',
        branchId: 'b1',
        createdBy: 'u1',
        createdAt: new Date().toISOString(),
        payments: [],
      },
    ];
  },

  /**
   * Retrieves a purchase by ID.
   */
  getPurchaseById: async (id: string): Promise<Purchase> => {
    return {
      id,
      purchaseAmount: 14000,
      documentationFee: 500,
      labourCost: 200,
      handlingFee: 100,
      transportationCost: 100,
      shippingCost: 100,
      groundfieldCost: 0,
      totalAmount: 15000,
      status: 'UNPAID',
      lotId: 'lot-1',
      vendorId: 'v1',
      branchId: 'b1',
      createdBy: 'u1',
      createdAt: new Date().toISOString(),
      payments: [],
    };
  },

  /**
   * Retrieves a purchase by Lot ID.
   */
  getPurchaseByLotId: async (lotId: string): Promise<Purchase | null> => {
    console.log('Fetching purchase for lot:', lotId);
    return null;
  },

  /**
   * Creates a new purchase.
   */
  createPurchase: async (data: CreatePurchaseDTO): Promise<Purchase> => {
    return {
      id: Math.random().toString(36).substr(2, 9),
      purchaseAmount: 1000,
      documentationFee: data.documentationFee,
      labourCost: data.labourCost,
      handlingFee: data.handlingFee,
      transportationCost: data.transportationCost,
      shippingCost: data.shippingCost,
      groundfieldCost: data.groundfieldCost,
      totalAmount:
        1000 +
        data.documentationFee +
        data.labourCost +
        data.handlingFee +
        data.transportationCost +
        data.shippingCost +
        data.groundfieldCost,
      status: 'UNPAID',
      lotId: data.lotId,
      vendorId: 'v1',
      branchId: 'b1',
      createdBy: 'u1',
      createdAt: new Date().toISOString(),
      payments: [],
    };
  },

  /**
   * Updates an existing purchase.
   */
  updatePurchase: async (id: string, data: UpdatePurchaseDTO): Promise<Purchase> => {
    return {
      id,
      purchaseAmount: 14000,
      documentationFee: data.documentationFee || 0,
      labourCost: data.labourCost || 0,
      handlingFee: data.handlingFee || 0,
      transportationCost: data.transportationCost || 0,
      shippingCost: data.shippingCost || 0,
      groundfieldCost: data.groundfieldCost || 0,
      totalAmount: 15000,
      status: 'PAID',
      lotId: 'lot-1',
      vendorId: 'v1',
      branchId: 'b1',
      createdBy: 'u1',
      createdAt: new Date().toISOString(),
      payments: [],
    };
  },

  /**
   * Deletes a purchase.
   */
  deletePurchase: async (id: string): Promise<void> => {
    console.log('Deleting purchase:', id);
  },

  /**
   * Adds a payment to a purchase.
   */
  addPayment: async (purchaseId: string, data: AddPaymentDto): Promise<{ success: boolean }> => {
    console.log('Adding payment for purchase:', purchaseId, data);
    return { success: true };
  },
};
