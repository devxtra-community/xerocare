import api from '@/lib/api';

export interface SalesTrendData {
  date: string;
  totalSales: number;
}

export interface BranchSalesTotals {
  totalSales: number;
  salesByType: { saleType: string; total: number }[];
  totalInvoices: number;
}

export const salesService = {
  /**
   * Retrieves branch sales overview trends.
   */
  getBranchSalesOverview: async (period: string = '1M'): Promise<SalesTrendData[]> => {
    const response = await api.get(`/b/invoices/sales/branch-overview?period=${period}`);
    return response.data.data;
  },

  /**
   * Retrieves branch sales totals.
   */
  getBranchSalesTotals: async (): Promise<BranchSalesTotals> => {
    const response = await api.get('/b/invoices/sales/branch-totals');
    return response.data.data;
  },

  /**
   * Retrieves global sales overview trends.
   */
  getGlobalSalesOverview: async (period: string = '1M'): Promise<SalesTrendData[]> => {
    const response = await api.get(`/b/invoices/sales/global-overview?period=${period}`);
    return response.data.data;
  },

  /**
   * Retrieves global sales totals.
   */
  getGlobalSalesTotals: async (): Promise<BranchSalesTotals> => {
    const response = await api.get('/b/invoices/sales/global-totals');
    return response.data.data;
  },
};
