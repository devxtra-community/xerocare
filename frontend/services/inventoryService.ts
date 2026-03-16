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
  /** Total number of items we have ever had for this model. */
  total_qty: number;
  /** Number of items currently sitting in the warehouse and ready to sell. */
  available_qty: number;
  /** Number of items currently with customers who are renting them. */
  rented_qty: number;
  /** Number of items currently out on lease agreements. */
  lease_qty: number;
  /** Items that are in the warehouse but broken or need repair. */
  damaged_qty: number;
  /** Number of items that have been fully paid for and delivered to customers. */
  sold_qty: number;
  product_cost: number;
}

/**
 * Summary information about how much stock we have and its total value.
 */
export interface InventoryStats {
  productStock: number;
  spareStock: number;
  productValue: number;
  spareValue: number;
}

/**
 * The Inventory Service tracks our stock levels across all company locations.
 */
export const inventoryService = {
  /**
   * (For Administrators) Get a complete report of all stock in every branch.
   */
  getGlobalInventory: async (year?: number | 'all'): Promise<InventoryItem[]> => {
    const params = year && year !== 'all' ? { year } : {};
    const response = await api.get('/i/inventory', { params });
    return response.data.data;
  },

  /**
   * (For Branch Managers) Get a report of the stock available only in your local branch.
   */
  getBranchInventory: async (year?: number | 'all'): Promise<InventoryItem[]> => {
    const params = year && year !== 'all' ? { year } : {};
    const response = await api.get('/i/inventory/branch', { params });
    return response.data.data;
  },

  /**
   * (For Warehouse Staff) Get a detailed list of items stored in one specific warehouse.
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
   * Get a high-level overview of our stock levels and how much money is tied up in inventory.
   */
  getInventoryStats: async (year?: number | 'all'): Promise<InventoryStats> => {
    const params = year && year !== 'all' ? { year } : {};
    const response = await api.get('/i/inventory/stats', { params });
    return response.data.data;
  },
};
