import api from '@/lib/api';

export interface Branch {
  id: string;
  name: string;
  address: string;
  location: string;
  manager_id: string;
  started_date: string;
  status: string;
}

export const branchService = {
  getMyBranch: async (): Promise<Branch> => {
    const response = await api.get('/i/branch/my-branch');
    return response.data.data;
  },
};
