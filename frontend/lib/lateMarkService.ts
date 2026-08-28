import api from './api';

export interface MarkLateData {
  employee_id: string;
  date: string;
  note?: string;
}

// Mark an employee late for a given date (HR/Manager/Admin only)
export async function markLate(data: MarkLateData) {
  const response = await api.post('/e/late-marks', data);
  return response.data;
}

// Get an employee's late count for the current year
export async function getEmployeeLateCount(employeeId: string) {
  const response = await api.get<{ success: boolean; message: string; data: { count: number } }>(
    `/e/late-marks/employee/${employeeId}/count`,
  );
  return response.data;
}
