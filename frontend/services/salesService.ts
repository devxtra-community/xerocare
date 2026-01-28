import api from '@/lib/api';

export interface SalesTrendData {
  date: string;
  totalSales: number;
}

export const salesService = {
  getBranchSalesOverview: async (period: string = '1M'): Promise<SalesTrendData[]> => {
    const response = await api.get(`/b/invoices/sales/branch-overview?period=${period}`);
    return response.data.data;
  },
};
