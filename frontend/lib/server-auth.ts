import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import type { UserRole } from './auth';
import type { EmployeeJob } from './employeeJob';

interface ServerJwtPayload {
  userId: string;
  role: UserRole;
  employeeJob?: EmployeeJob | null;
  exp: number;
}

/**
 * Server-side read of the accessToken cookie (kept in sync with localStorage
 * by lib/api.ts's refresh interceptor). Lets layouts pick the right sidebar
 * on the first server-rendered paint instead of a client useEffect flashing
 * it in after mount.
 */
export async function getServerUser(): Promise<ServerJwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  if (!token) return null;

  try {
    return jwtDecode<ServerJwtPayload>(token);
  } catch {
    return null;
  }
}
