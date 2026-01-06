import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { AccessTokenPayload } from '../types/jwt';

const ACCESS_SECRET = process.env.ACCESS_SECRET as Secret;
const REFRESH_SECRET = process.env.REFRESH_SECRET as Secret;

export function signAccesstoken(
  payload: AccessTokenPayload,
  expiresIn: SignOptions['expiresIn'] = '15m',
) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: expiresIn });
}

export function signRefreshtoken(payload: object, expiresIn: SignOptions['expiresIn'] = '15d') {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: expiresIn });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken<T>(token: string): T | null {
  return jwt.verify(token, REFRESH_SECRET) as T;
}
