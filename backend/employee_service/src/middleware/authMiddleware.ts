import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { verifyAccessToken } from '../utlis/jwt';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers?.authorization?.split(' ')[1];
  if (!token) {
    return next(new AppError('No access token', 401));
  }

  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return next(new AppError('Invalid access token', 401));
  }

  req.user = decoded;
  next();
};
