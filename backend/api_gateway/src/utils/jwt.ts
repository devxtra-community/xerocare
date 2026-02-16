import jwt, { Secret } from 'jsonwebtoken';

const ACCESS_SECRET = process.env.ACCESS_SECRET as Secret;

/**
 * Verifies the JWT access token and returns the decoded payload.
 * @param token - The JWT string to verify.
 */
export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET) as {
    userId: string;
    role: string;
    branchId?: string;
  };
};
