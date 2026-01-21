import api from '@/lib/api';

export const vendorService = {
  getVendors: async () => {
    const response = await api.get('/i/vendors');
    return response.data.data;
  },
};
