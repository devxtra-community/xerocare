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
  product_cost: number;
}

export interface InventoryStats {
  totalStock: number;
  productModels: number;
  totalValue: number;
  damagedStock: number;
}

export const inventoryService = {
  // Admin: Get all inventory across all locations
  /**
   * Retrieves global inventory (Admin).
   */
  getGlobalInventory: async (): Promise<InventoryItem[]> => {
    const response = await api.get('/i/inventory');
    return response.data.data;
  },

  // Manager: Get inventory for their branch
  /**
   * Retrieves inventory for the current user's branch (Manager).
   */
  getBranchInventory: async (): Promise<InventoryItem[]> => {
    const response = await api.get('/i/inventory/branch');
    return response.data.data;
  },

  // Warehouse Staff / Specific View: Get inventory for a specific warehouse
  /**
   * Retrieves inventory for a specific warehouse.
   */
  getWarehouseInventory: async (warehouseId: string): Promise<InventoryItem[]> => {
    const response = await api.get(`/i/inventory/warehouse`, { params: { warehouseId } });
    return response.data.data;
  },

  /**
   * Retrieves inventory statistics.
   */
  getInventoryStats: async (): Promise<InventoryStats> => {
    const response = await api.get('/i/inventory/stats');
    return response.data.data;
  },
};
