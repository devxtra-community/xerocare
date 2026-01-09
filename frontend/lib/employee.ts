import api from './api';

export interface Employee {
  id: string;
  display_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  salary: number | null;
  profile_image_url: string | null;
  createdAt: string;
  updatedAt: string;
  expire_date: string | null;
  status: string;
  branch_id?: string | null;
  branch?: {
    branch_id: string;
    name: string;
  } | null;
}

export interface HRStats {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    ADMIN: number;
    HR: number;
    MANAGER: number;
    EMPLOYEE: number;
  };
}

export interface EmployeeResponse {
  employees: Employee[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const createEmployee = async (formData: FormData) => {
  const res = await api.post('/e/employee/create', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

export const getAllEmployees = async (page: number = 1, limit: number = 20, role?: string) => {
  const res = await api.get('/e/employee/', {
    params: { page, limit, role: role === 'All' ? undefined : role },
  });
  return res.data;
};

export const getEmployeeById = async (id: string) => {
  const res = await api.get(`/e/employee/${id}`);
  return res.data;
};

export const deleteEmployee = async (id: string) => {
  const res = await api.delete(`/e/employee/${id}`);
  return res.data;
};

export const updateEmployee = async (id: string, data: FormData | object) => {
  const res = await api.put(`/e/employee/${id}`, data);
  return res.data;
};

export const getEmployeeIdProof = async (id: string) => {
  const res = await api.get(`/e/employee/${id}/id-proof`);
  return res.data;
};

export const getHRStats = async () => {
  const res = await api.get('/e/employee/stats');
  return res.data;
};

export const getManagersByRole = async () => {
  const res = await api.get('/e/employee?role=MANAGER');
  return res.data;
};
