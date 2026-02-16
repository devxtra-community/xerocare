import api from './api';

export interface Employee {
  id: string;
  display_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  phone: string | null;
  salary: number | null;
  profile_image_url: string | null;
  createdAt: string;
  updatedAt: string;
  expire_date: string | null;
  status: string;
  reporting_manager: string | null;
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
    FINANCE: number;
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

/**
 * Registers a new employee in the system.
 * @param formData FormData containing employee details and images
 */
export const createEmployee = async (formData: FormData) => {
  const res = await api.post('/e/employee/create', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

/**
 * Retrieves a paginated list of all employees, optionally filtered by role.
 * @param page The page number (default: 1)
 * @param limit The number of items per page (default: 20)
 * @param role Optional role to filter by
 */
export const getAllEmployees = async (
  page: number = 1,
  limit: number = 20,
  role?: string,
): Promise<{ success: boolean; data: EmployeeResponse }> => {
  const res = await api.get('/e/employee/', {
    params: { page, limit, role: role === 'All' ? undefined : role },
  });
  return res.data;
};

/**
 * Retrieves full details for a specific employee by ID.
 */
export const getEmployeeById = async (id: string) => {
  const res = await api.get(`/e/employee/${id}`);
  return res.data;
};

/**
 * Deletes an employee record from the system.
 */
export const deleteEmployee = async (id: string) => {
  const res = await api.delete(`/e/employee/${id}`);
  return res.data;
};

/**
 * Updates an existing employee's data.
 * @param id The ID of the employee
 * @param data Updated employee data (FormData or object)
 */
export const updateEmployee = async (id: string, data: FormData | object) => {
  const res = await api.put(`/e/employee/${id}`, data);
  return res.data;
};

/**
 * Retrieves the ID proof document for a specific employee.
 */
export const getEmployeeIdProof = async (id: string) => {
  const res = await api.get(`/e/employee/${id}/id-proof`);
  return res.data;
};

/**
 * Retrieves aggregate statistics for the HR dashboard.
 */
export const getHRStats = async () => {
  const res = await api.get('/e/employee/stats');
  return res.data;
};

/**
 * Retrieves a list of all users with the MANAGER role.
 */
export const getManagersByRole = async () => {
  const res = await api.get('/e/employee?role=MANAGER');
  return res.data;
};
