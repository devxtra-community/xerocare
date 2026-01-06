import { signAccesstoken, signRefreshtoken } from '../utlis/jwt';
import { AuthRepository } from '../repositories/authRepository';
import { Request, Response } from 'express';

const authRepo = new AuthRepository();

export async function issueTokens(user: any, req: Request, res: Response) {
  const accessToken = signAccesstoken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = signRefreshtoken({ id: user.id });

  await authRepo.saveRefreshToken(user, refreshToken, {
    ip_address: req.ip,
    user_agent: req.headers['user-agent'] || 'unknown',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 24 * 60 * 60 * 1000,
  });

  return accessToken;
}
