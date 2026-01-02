import axios from "axios";

export const requestRefresh = async (): Promise<string> => {
  const res = await axios.post(
    "http://localhost:3001/e/auth/refresh",
    {},
    { withCredentials: true }
  );

  return res.data.accessToken;
};
