import api from '@/lib/api';

export interface SalesTrendData {
  date: string;
  saleType: string;
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
  getBranchSalesOverview: async (
    period: string = '1M',
    year?: number,
  ): Promise<SalesTrendData[]> => {
    const url = year
      ? `/b/invoices/sales/branch-overview?period=${period}&year=${year}`
      : `/b/invoices/sales/branch-overview?period=${period}`;
    const response = await api.get(url);
    return response.data.data;
  },

  /**
   * Retrieves branch sales totals.
   */
  getBranchSalesTotals: async (year?: number): Promise<BranchSalesTotals> => {
    const url = year
      ? `/b/invoices/sales/branch-totals?year=${year}`
      : '/b/invoices/sales/branch-totals';
    const response = await api.get(url);
    return response.data.data;
  },

  /**
   * Retrieves global sales overview trends.
   */
  getGlobalSalesOverview: async (
    period: string = '1M',
    year?: number,
  ): Promise<SalesTrendData[]> => {
    const url = year
      ? `/b/invoices/sales/global-overview?period=${period}&year=${year}`
      : `/b/invoices/sales/global-overview?period=${period}`;
    const response = await api.get(url);
    return response.data.data;
  },

  /**
   * Retrieves global sales totals.
   */
  getGlobalSalesTotals: async (year?: number): Promise<BranchSalesTotals> => {
    const url = year
      ? `/b/invoices/sales/global-totals?year=${year}`
      : '/b/invoices/sales/global-totals';
    const response = await api.get(url);
    return response.data.data;
  },
};
