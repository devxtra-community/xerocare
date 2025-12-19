import axios from "axios";
import { applyAuthTokenInterceptor } from "axios-jwt";
import { requestRefresh } from "./auth-refresh";

const api = axios.create({
  baseURL: "http://localhost:3001",
  withCredentials: true,
});

applyAuthTokenInterceptor(api, {
  requestRefresh,
});

// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("accessToken");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

export default api;
