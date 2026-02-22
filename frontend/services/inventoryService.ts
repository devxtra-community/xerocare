import api from '@/lib/api';

export interface InventoryItem {
  warehouse_id?: string;
  warehouse_name?: string;
  model_id: string;
  model_name: string;
  product_name: string;
  image_url?: string;
  brand: string;
  vendor_id?: string;
  vendor_name?: string;
  total_qty: number;
  available_qty: number;
  rented_qty: number;
  lease_qty: number;
  damaged_qty: number;
  sold_qty: number;
  product_cost: number;
}

export interface InventoryStats {
  productStock: number;
  spareStock: number;
  productValue: number;
  spareValue: number;
}

export const inventoryService = {
  // Admin: Get all inventory across all locations
  /**
   * Retrieves global inventory (Admin).
   */
  getGlobalInventory: async (year?: number | 'all'): Promise<InventoryItem[]> => {
    const params = year && year !== 'all' ? { year } : {};
    const response = await api.get('/i/inventory', { params });
    return response.data.data;
  },

  // Manager: Get inventory for their branch
  /**
   * Retrieves inventory for the current user's branch (Manager).
   */
  getBranchInventory: async (year?: number | 'all'): Promise<InventoryItem[]> => {
    const params = year && year !== 'all' ? { year } : {};
    const response = await api.get('/i/inventory/branch', { params });
    return response.data.data;
  },

  // Warehouse Staff / Specific View: Get inventory for a specific warehouse
  /**
   * Retrieves inventory for a specific warehouse.
   */
  getWarehouseInventory: async (
    warehouseId: string,
    year?: number | 'all',
  ): Promise<InventoryItem[]> => {
    const params: { warehouseId: string; year?: number } = { warehouseId };
    if (year && year !== 'all') params.year = year;
    const response = await api.get(`/i/inventory/warehouse`, { params });
    return response.data.data;
  },

  /**
   * Retrieves inventory statistics.
   */
  getInventoryStats: async (year?: number | 'all'): Promise<InventoryStats> => {
    const params = year && year !== 'all' ? { year } : {};
    const response = await api.get('/i/inventory/stats', { params });
    return response.data.data;
  },
};
