import api from '@/lib/api';

/**
 * The Vendor Service helps us look up the companies (Vendors)
 * that provide us with products and parts.
 */
export const vendorService = {
  /**
   * Get a list of all the partner vendors we work with.
   */
  getVendors: async () => {
    const response = await api.get('/i/vendors');
    return response.data.data;
  },
};
