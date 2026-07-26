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

/**
 * ADMIN tokens carry no `branchId` — an admin belongs to the organisation, not
 * to one branch. Reads therefore return every branch, but writes cannot: every
 * create/update path derives the owning branch from `req.user.branchId`.
 *
 * The `x-acting-branch` header lets an admin nominate the branch to act in.
 * It is applied ONLY when the *verified* token says the caller is an ADMIN, so
 * a non-admin sending the header changes nothing and cannot escalate. Request
 * bodies still may not carry `branchId` — that guard stays intact.
 */
const applyActingBranch = (req: Request) => {
  if (!req.user || req.user.role !== 'ADMIN') return;

  const actingBranch = req.headers['x-acting-branch'];
  const branchId = Array.isArray(actingBranch) ? actingBranch[0] : actingBranch;

  if (branchId) {
    req.user.branchId = branchId;
  }
};

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers?.authorization?.split(' ')[1];
  if (!token) {
    return next(new AppError('No access token', 401));
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    applyActingBranch(req);
    next();
  } catch (error: unknown) {
    const err = error as { name?: string };
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Access token expired', 401, 'TOKEN_EXPIRED'));
    }
    return next(new AppError('Invalid access token', 401, 'TOKEN_INVALID'));
  }
};
