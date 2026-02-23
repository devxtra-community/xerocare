import api from './api';
import { jwtDecode } from 'jwt-decode';
import { EmployeeJob } from './employeeJob';
import { FinanceJob } from './financeJob';

export type UserRole = 'HR' | 'EMPLOYEE' | 'FINANCE' | 'MANAGER' | 'ADMIN';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  branchId?: string;
  employeeJob?: EmployeeJob | null;
  financeJob?: FinanceJob | null;
  exp: number;
}

/**
 * Decodes and retrieves user information from the stored JWT access token.
 * @returns JwtPayload object if token is valid, otherwise null.
 */
export function getUserFromToken(): JwtPayload | null {
  // Check if we're in the browser (not SSR)
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

/**
 * Initiates the login process by requesting an OTP for the given credentials.
 * @param email User's email address
 * @param password User's password
 */
export async function requestLoginOtp(email: string, password: string) {
  const res = await api.post('/e/auth/login', {
    email,
    password,
  });
  return res.data;
}

/**
 * Verifies the login OTP and stores the received access token in localStorage.
 * @param email User's email address
 * @param otp The one-time password received by the user
 */
export async function verifyLoginOtp(email: string, otp: string) {
  const res = await api.post('/e/auth/login/verify', {
    email,
    otp,
  });
  localStorage.setItem('accessToken', res.data.accessToken);

  return res.data;
}

/**
 * Requests a magic link to be sent to the user's email for passwordless login.
 * @param email User's email address
 */
export async function requestMagicLink(email: string) {
  const res = await api.post('/e/auth/magic-link', { email });
  return res.data;
}

/**
 * Verifies a magic link token and stores the received access token in localStorage.
 * @param token The magic link token from the URL
 */
export async function verifyMagicLink(token: string) {
  const res = await api.post('/e/auth/magic-link/verify', { token });
  localStorage.setItem('accessToken', res.data.accessToken);

  return res.data;
}

/**
 * Requests an OTP for password reset.
 * @param email User's email address
 */
export async function requestForgotPasswordOtp(email: string) {
  const res = await api.post('/e/auth/forgot-password', { email });
  return res.data;
}

/**
 * Resets the user's password using a verification OTP.
 * @param email User's email address
 * @param otp The verification OTP
 * @param newPassword The new password to set
 */
export async function resetPassword(email: string, otp: string, newPassword: string) {
  const res = await api.post('/e/auth/forgot-password/verify', {
    email,
    otp,
    newPassword,
  });
  return res.data;
}

/**
 * Logs out the current user by calling the API and clearing localStorage.
 */
export async function logout() {
  try {
    const res = await api.post('/e/auth/logout');
    if (res.data.success) {
      localStorage.clear();
      return res;
    }
  } catch (err) {
    console.log(err);
  }
}

/**
 * Performs admin-specific login and stores the received access token.
 * @param email Admin's email address
 * @param password Admin's password
 */
export async function adminLogin(email: string, password: string) {
  const res = await api.post('/e/admin/login', {
    email,
    password,
  });
  localStorage.setItem('accessToken', res.data.accessToken);
  return res.data;
}

/**
 * Changes the current user's password.
 * @param currentPassword The user's current password
 * @param newPassword The new password to set
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  const res = await api.post('/e/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return res.data;
}

/**
 * Retrieves all active sessions for the current user.
 */
export async function getSessions() {
  const res = await api.get('/e/auth/sessions');
  return res.data;
}

/**
 * Logs out the user from all other active devices/sessions.
 */
export async function logoutOtherDevices() {
  const res = await api.post('/e/auth/logout-other-devices');
  return res.data;
}

/**
 * Terminates a specific session by ID.
 * @param sessionId The ID of the session to terminate
 */
export async function logoutSession(sessionId: string) {
  const res = await api.post('/e/auth/sessions/logout', { sessionId });
  return res.data;
}

/**
 * Retrieves the current user's profile information.
 */
export async function getProfile() {
  const res = await api.get('/e/auth/me');
  return res.data;
}
