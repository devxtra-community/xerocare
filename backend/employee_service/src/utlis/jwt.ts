import jwt, { Secret, SignOptions } from "jsonwebtoken";

const ACCESS_SECRET = process.env.ACCESS_SECRET as Secret;
const REFRESH_SECRET = process.env.REFRESH_SECRET as Secret;

export function signAccesstoken(payload: object, expiresIn: SignOptions["expiresIn"] = "15m") {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn:expiresIn });
}

export function signRefreshtoken(payload: object, expiresIn: SignOptions["expiresIn"] = "15d") {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn:expiresIn });
}

export function verifyAccessToken<T>(token: string): T | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as T;
  } catch {
    return null;
  }
}

export function verifyRefreshToken<T>(token: string): T | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as T;
  } catch {
    return null;
  }
}
