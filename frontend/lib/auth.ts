import api from './api';

import { jwtDecode } from 'jwt-decode';

export type UserRole = 'HR' | 'EMPLOYEE' | 'FINANCE' | 'MANAGER';

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
  localStorage.setItem('accessToken', res.data.accessToken);

  return res.data;
}

export async function requestMagicLink(email: string) {
  const res = await api.post('/e/auth/magic-link', { email });
  return res.data;
}

export async function verifyMagicLink( token: string) {
  const res = await api.post('/e/auth/magic-link/verify', { token });
  localStorage.setItem('accessToken', res.data.accessToken);

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
      localStorage.clear();
      return res;
    }
  } catch (err) {
    console.log(err);
  }
}

export async function adminLogin(email: string, password: string) {
  const res = await api.post('/e/admin/login', {
    email,
    password,
  });
  localStorage.setItem('accessToken', res.data.accessToken);
  return res.data;
}
