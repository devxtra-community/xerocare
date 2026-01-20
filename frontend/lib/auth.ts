import api from './api';

import { jwtDecode } from 'jwt-decode';
import { setAccessToken, clearAuth } from './token';

export type UserRole = 'HR' | 'EMPLOYEE' | 'FINANCE' | 'MANAGER' | 'ADMIN';

export interface JwtPayload {
  id: string;
  role: UserRole;
  exp: number;
}

export function getUserFromToken(): JwtPayload | null {
  const token = localStorage.getItem('accessToken');
  if (!token) return null;

  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export async function requestLoginOtp(email: string, password: string) {
  const res = await api.post('/e/auth/login', {
    email,
    password,
  });
  return res.data;
}

export async function verifyLoginOtp(email: string, otp: string) {
  const res = await api.post('/e/auth/login/verify', {
    email,
    otp,
  });
  if (res.data.success && res.data.accessToken) {
    setAccessToken(res.data.accessToken);
  }

  return res.data;
}

export async function requestMagicLink(email: string) {
  const res = await api.post('/e/auth/magic-link', { email });
  return res.data;
}

export async function verifyMagicLink(token: string) {
  const res = await api.post('/e/auth/magic-link/verify', { token });
  if (res.data.success && res.data.accessToken) {
    setAccessToken(res.data.accessToken);
  }

  return res.data;
}

export async function requestForgotPasswordOtp(email: string) {
  const res = await api.post('/e/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword(email: string, otp: string, newPassword: string) {
  const res = await api.post('/e/auth/forgot-password/verify', {
    email,
    otp,
    newPassword,
  });
  return res.data;
}

export async function logout() {
  try {
    const res = await api.post('/e/auth/logout');
    if (res.data.success) {
      clearAuth();
      return res;
    }
  } catch (err) {
    console.log(err);
    // Even if logout fails on server, clear local auth
    clearAuth();
  }
}

export async function adminLogin(email: string, password: string) {
  const res = await api.post('/e/admin/login', {
    email,
    password,
  });
  if (res.data.success && res.data.accessToken) {
    setAccessToken(res.data.accessToken);
  }
  return res.data;
}

export async function getProfile() {
  const res = await api.get('/e/auth/me');
  return res.data;
}
