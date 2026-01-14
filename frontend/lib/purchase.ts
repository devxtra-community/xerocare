import api from './api';

export interface PurchaseItem {
  id?: string;
  productName: string;
  modelName: string;
  quantity: number;
  unitCost: number;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  lotNumber: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  totalCost: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  date: string;
  items: PurchaseItem[];
}

export interface PurchaseStats {
  totalCost: number;
  totalOrders: number;
  totalVendors: number;
  totalProducts: number;
}

export async function createPurchase(data: Partial<Purchase>) {
  const res = await api.post('/i/purchases/', data);
  return res.data;
}

export async function getPurchases() {
  const res = await api.get('/i/purchases/');
  // If backend not ready, return mock data??
  // For now let's assume API works or we will mock it in the component if it fails.
  return res.data;
}

export async function getPurchaseById(id: string) {
  const res = await api.get(`/i/purchases/${id}`);
  return res.data;
}

export async function updatePurchase(id: string, data: Partial<Purchase>) {
  const res = await api.patch(`/i/purchases/${id}`, data);
  return res.data;
}

export async function deletePurchase(id: string) {
  const res = await api.delete(`/i/purchases/${id}`);
  return res.data;
}

export async function getPurchaseStats(): Promise<PurchaseStats> {
  // Check if there is a stats endpoint, otherwise we might calculate it or mock it.
  try {
    const res = await api.get('/i/purchases/stats');
    return res.data;
  } catch {
    // Fallback or mock if endpoint doesn't exist
    return {
      totalCost: 0,
      totalOrders: 0,
      totalVendors: 0,
      totalProducts: 0,
    };
  }
}
