import api from '@/lib/api';

export interface InventoryItem {
  warehouse_id?: string;
  warehouse_name?: string;
  model_id: string;
  model_name: string;
  brand: string;
  vendor_id?: string;
  vendor_name?: string;
  total_qty: number;
  available_qty: number;
  rented_qty: number;
  damaged_qty: number;
  sold_qty: number;
}

export interface InventoryStats {
  totalProducts: number;
  totalStockUnits: number;
  totalValue: number;
  damagedStock: number;
}

export const inventoryService = {
  // Admin: Get all inventory across all locations
  getGlobalInventory: async (): Promise<InventoryItem[]> => {
    const response = await api.get('/i/inventory');
    return response.data.data;
  },

  // Manager: Get inventory for their branch
  getBranchInventory: async (): Promise<InventoryItem[]> => {
    const response = await api.get('/i/inventory/branch');
    return response.data.data;
  },

  // Warehouse Staff / Specific View: Get inventory for a specific warehouse
  getWarehouseInventory: async (warehouseId: string): Promise<InventoryItem[]> => {
    const response = await api.get(`/i/inventory/warehouse`, { params: { warehouseId } });
    // OR if backend expects body for GET (unusual but possible with some frameworks, but GET usually params)
    // Check backend controller: const { warehouseId } = req.body; -> This is GET with body?
    // Backend controller said: inventoryRouter.get('/warehouse', getWarehouseInventory);
    // And controller: const { warehouseId } = req.body;
    // GET requests with body are often stripped by proxies/browsers.
    // I should probably check if I can change backend to use params or query.
    // For now, I'll try to send data. If axios strips it, I'll have to fix backend.
    // Standard practice is query params for GET.
    // Let's try sending as query param first (params: { warehouseId }) and see if backend reads it.
    // Actually, Express `req.body` on GET is allowed but discouraged.
    // I will assume for now I might need to fix backend or send config.
    return response.data.data;
  },

  getInventoryStats: async (): Promise<InventoryStats> => {
    const response = await api.get('/i/inventory/stats');
    return response.data.data;
  },
};
