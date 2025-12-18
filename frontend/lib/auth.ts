import api from "./api";
import { setAuthTokens } from "axios-jwt";
import { jwtDecode } from "jwt-decode";

export type UserRole = "ADMIN" | "HR" | "EMPLOYEE" | "FINANCE" | "MANAGER";

export interface JwtPayload {
  id: string;
  role: UserRole;
  exp: number;
}

export function getUserFromToken(): JwtPayload | null {
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  try {
    return jwtDecode<JwtPayload>(token);
  } catch {
    return null;
  }
}

export async function login(email: string, password: string) {
  const res = await api.post("/auth/login", {
    email,
    password,
  });
  console.log(res)
  setAuthTokens({
    accessToken: res.data.accessToken,
    refreshToken: res.data.refreshToken,
  });
  return res.data;
}

export async function logout() {

  try{
      const res = await api.post('/auth/logout');
      console.log(res)
      if(res.data.success)
      {
        localStorage.clear();
        return res.data
        
      }
  }
  catch(err){
    console.log(err);
  }
}
