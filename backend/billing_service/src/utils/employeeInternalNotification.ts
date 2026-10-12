import { sign } from 'jsonwebtoken';

export interface EmployeeInternalNotification {
  employee_id: string;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, unknown> | null;
}

type FetchLike = typeof fetch;

export async function sendEmployeeInternalNotification(
  notification: EmployeeInternalNotification,
  fetcher: FetchLike = fetch,
): Promise<void> {
  const accessSecret = process.env.ACCESS_SECRET;
  if (!accessSecret)
    throw new Error('ACCESS_SECRET is required for Employee Service authentication');

  const baseUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
  const token = sign({ userId: 'billing_service', role: 'ADMIN' }, accessSecret, {
    expiresIn: '1m',
  });
  const response = await fetcher(`${baseUrl}/notifications/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-internal-service': 'billing',
    },
    body: JSON.stringify(notification),
  });
  if (!response.ok) {
    throw new Error(`Employee Service rejected notification (HTTP ${response.status})`);
  }
}
