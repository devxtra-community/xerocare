import axios from 'axios';
import { requestRefresh } from './auth-refresh';

/**
 * This is the "Messenger" of our application.
 * Its job is to carry messages (data) between the user's browser
 * and our company's backend servers.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

/**
 * Logging Helper: Mask sensitive information in logs
 */
const maskData = (data: unknown): unknown => {
  if (!data || typeof data !== 'object') return data;
  const masked = { ...(data as Record<string, unknown>) };
  const sensitiveKeys = ['password', 'otp', 'accessToken', 'refreshToken', 'token'];
  sensitiveKeys.forEach((key) => {
    if (key in masked) masked[key] = '********';
  });
  return masked;
};

interface CustomConfig {
  _startTime?: number;
}

// Security Check: Every time we send a message, we attach a "Digital ID Card"
// (AccessToken) so the server knows who is asking.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // --- LOGGING: Request ---
  const startTime = Date.now();
  (config as CustomConfig)._startTime = startTime;

  console.group(
    `%cAPI Request: ${config.method?.toUpperCase()} ${config.url}`,
    'color: #3b82f6; font-weight: bold;',
  );
  console.log('URL:', config.baseURL ? config.baseURL + config.url : config.url);
  console.log('Method:', config.method?.toUpperCase());
  console.log('Headers:', config.headers);
  if (config.params) console.log('Params:', config.params);
  if (config.data) console.log('Body:', maskData(config.data));
  console.groupEnd();

  return config;
});

interface FailedRequest {
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

/**
 * Handling Problems: What happens if a message fails?
 */
api.interceptors.response.use(
  (response) => {
    // --- LOGGING: Success Response ---
    const duration = Date.now() - ((response.config as CustomConfig)._startTime || Date.now());
    console.group(
      `%cAPI Response [${response.status}]: ${response.config.method?.toUpperCase()} ${response.config.url}`,
      'color: #10b981; font-weight: bold;',
    );
    console.log('Status:', response.status);
    console.log('Duration:', `${duration}ms`);
    console.log('Data:', response.data);
    console.groupEnd();

    return response;
  },
  async (error) => {
    // --- LOGGING: Error Response ---
    const startTime = (error.config as CustomConfig)?._startTime;
    const duration = startTime ? Date.now() - startTime : 'N/A';
    const status = error.response?.status;
    const url = error.config?.url || 'Unknown URL';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';

    console.group(
      `%cAPI Error [${status || 'Network Error'}]: ${method} ${url}`,
      'color: #ef4444; font-weight: bold;',
    );
    console.log('Status:', status);
    console.log('Duration:', `${duration}ms`);
    console.log('Message:', error.message);
    if (error.response?.data) console.log('Error Data:', error.response.data);
    console.log('Full Error Object:', error);
    console.groupEnd();

    const originalRequest = error.config;
    const errorCode = error.response?.data?.code;

    // Safety First: If the Digital ID Card is expired or invalid,
    // we immediately log the user out to protect their account.
    if (status === 401 && (errorCode === 'TOKEN_REVOKED' || errorCode === 'TOKEN_INVALID')) {
      localStorage.clear();

      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/adminlogin';
      } else {
        window.location.href = '/login';
      }

      return Promise.reject(error);
    }

    // Automatic Re-login: If the temporary ID card expires while the user is active,
    // we try to quickly get a fresh one in the background so they don't get interrupted.
    const isLoginRequest = originalRequest.url?.includes('/login');

    if (status === 401 && !originalRequest._retry && !isLoginRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await requestRefresh();

        localStorage.setItem('accessToken', newAccessToken);
        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // If even the background re-login fails, we must ask the user to sign in again.
        localStorage.clear();

        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/adminlogin';
        } else {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
