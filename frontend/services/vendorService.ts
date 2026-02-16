import api from '@/lib/api';

export const vendorService = {
  /**
   * Retrieves all vendors.
   */
  getVendors: async () => {
    const response = await api.get('/i/vendors');
    return response.data.data;
  },
};
