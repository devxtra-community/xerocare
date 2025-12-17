import api from "./api";
import { setAuthTokens } from "axios-jwt";

export async function login(email: string, password: string) {
  const res = await api.post("/auth/verify", {
    email,
    password,
  });

  setAuthTokens({
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken,
  });

  return res.data;
}

export function logout() {
  localStorage.clear(); 
}
