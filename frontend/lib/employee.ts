import api from './api';
export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function createEmployee(formData: FormData) {
  const res = await api.post('/e/employee/create', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function getAllEmployees() {
  const res = await api.get('/e/employee/');
  return res.data;
}

export async function getEmployeeById(id: string) {
  const res = await api.get(`/e/employee/${id}`);
  return res.data;
}

export async function deleteEmployee(id: string) {
  const res = await api.delete(`/e/employee/${id}`);
  return res.data;
}

export async function getEmployeeIdProof(id: string) {
  const res = await api.get(`/e/employee/${id}/id-proof`);
  return res.data;
}
