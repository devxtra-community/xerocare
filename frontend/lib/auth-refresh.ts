import axios from 'axios';

export const requestRefresh = async (): Promise<string> => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';
  const res = await axios.post(`${baseURL}/e/auth/refresh`, {}, { withCredentials: true });

  return res.data.accessToken;
};
