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

export default api;
