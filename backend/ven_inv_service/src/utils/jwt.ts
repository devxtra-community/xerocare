import jwt, { Secret } from "jsonwebtoken";
import { AccessTokenPayload } from "../types/jwt";

const ACCESS_SECRET = process.env.ACCESS_SECRET as Secret;

export function verifyAccessToken(token: string):AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}
