import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AppError } from '../errors/appError';

// declare global {
//     // eslint-disable-next-line @typescript-eslint/no-namespace
//     namespace Express {
//         interface Request {
//             user?: {
//                 userId: string;
//                 role: string;
//                 branchId?: string;
//             };
//         }
//     }
// }

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers?.authorization?.split(' ')[1];
  if (!token) {
    return next(new AppError('No access token', 401));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid access token', 401, 'TOKEN_INVALID'));
  }
};
