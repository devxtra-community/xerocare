// import axios from 'axios';

// const API_URL = 'http://localhost:5000/api/purchases'; // Adjust base URL as needed

export interface Purchase {
  id: string; // or number, depending on backend. Using string for UUIDs is safer generally.
  purchase_number: string;
  lot_number: string;
  product_ids: string[]; // List of product IDs
  product_names: string[]; // List of product names for display
  model_ids: string[];
  model_names: string[];
  vendor_id: string;
  vendor_name: string;
  total_amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export interface CreatePurchaseDTO {
  purchase_number: string;
  lot_number: string;
  product_ids: string[];
  model_ids: string[];
  vendor_id: string;
  total_amount: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export type UpdatePurchaseDTO = Partial<CreatePurchaseDTO>;

export const purchaseService = {
  getAllPurchases: async (): Promise<Purchase[]> => {
    // Mock data for now if backend isn't ready, or try to fetch
    // return (await axios.get(API_URL)).data;

    // Returning mock data for UI development
    return [
      {
        id: '1',
        purchase_number: 'PUR-001',
        lot_number: 'LOT-101',
        product_ids: ['p1', 'p2'],
        product_names: ['Laser Printer', 'Ink Cartridge'],
        model_ids: ['m1'],
        model_names: ['Canon X100'],
        vendor_id: 'v1',
        vendor_name: 'Tech Supplies Co',
        total_amount: 15000,
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
      },
      {
        id: '2',
        purchase_number: 'PUR-002',
        lot_number: 'LOT-102',
        product_ids: ['p3'],
        product_names: ['Office Chair'],
        model_ids: ['m2'],
        model_names: ['ErgoFlex'],
        vendor_id: 'v2',
        vendor_name: 'Furniture World',
        total_amount: 5000,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      },
    ];
  },

  getPurchaseById: async (id: string): Promise<Purchase> => {
    // const response = await axios.get(`${API_URL}/${id}`);
    // return response.data;
    return {
      id,
      purchase_number: 'PUR-001',
      lot_number: 'LOT-101',
      product_ids: ['p1', 'p2'],
      product_names: ['Laser Printer', 'Ink Cartridge'],
      model_ids: ['m1'],
      model_names: ['Canon X100'],
      vendor_id: 'v1',
      vendor_name: 'Tech Supplies Co',
      total_amount: 15000,
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
    };
  },

  createPurchase: async (data: CreatePurchaseDTO): Promise<Purchase> => {
    // const response = await axios.post(API_URL, data);
    // return response.data;
    console.log('Creating purchase:', data);
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...data,
      product_names: ['Mock Product'],
      model_names: ['Mock Model'],
      vendor_name: 'Mock Vendor',
      created_at: new Date().toISOString(),
    } as Purchase;
  },

  updatePurchase: async (id: string, data: UpdatePurchaseDTO): Promise<Purchase> => {
    // const response = await axios.put(`${API_URL}/${id}`, data);
    // return response.data;
    console.log('Updating purchase:', id, data);
    return {
      id,
      purchase_number: 'PUR-001',
      lot_number: 'LOT-101',
      product_ids: ['p1', 'p2'],
      product_names: ['Laser Printer', 'Ink Cartridge'],
      model_ids: ['m1'],
      model_names: ['Canon X100'],
      vendor_id: 'v1',
      vendor_name: 'Tech Supplies Co',
      total_amount: 15000,
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
      ...data,
    } as Purchase;
  },

  deletePurchase: async (id: string): Promise<void> => {
    // await axios.delete(`${API_URL}/${id}`);
    console.log('Deleting purchase:', id);
  },
};
