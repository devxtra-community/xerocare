import jwt, { Secret } from 'jsonwebtoken';

const ACCESS_SECRET = process.env.ACCESS_SECRET as Secret;

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET) as {
    userId: string;
    role: string;
    branchId?: string;
  };
};
