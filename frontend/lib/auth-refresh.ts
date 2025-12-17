import api from "./api";


export const requestRefresh = async (): Promise<string> => {
  const res = await api.post(
    "/auth/refresh",{},
    { withCredentials: true }
  );

  return res.data.accessToken;
  
};
