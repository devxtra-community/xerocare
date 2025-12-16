import jwt, { Secret, SignOptions } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET as Secret;

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}
export function signJwt(
  payload: object,
  expiresIn: SignOptions["expiresIn"] = "1d"
) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJwt<T>(token: string): T | null {
  try {
    return jwt.verify(token, JWT_SECRET) as T;
  } catch (err) {
    return null;
  }
}
