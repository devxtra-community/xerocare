import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';

// Roles that have access to the accounts module
const ACCOUNTS_ALLOWED_ROLES = ['ADMIN', 'FINANCE', 'MANAGER'];

export function parseBranchFilter(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return next(new AppError('Unauthorized', 401));

  const { role, branchId: jwtBranchId } = req.user;

  if (!ACCOUNTS_ALLOWED_ROLES.includes(role)) {
    return next(new AppError('Access denied: insufficient role for accounts module', 403));
  }

  if (role === 'MANAGER' || role === 'FINANCE') {
    // Locked to their own branch — never override
    req.branchFilter = jwtBranchId ? [jwtBranchId] : [];
    req.isMultiBranch = false;
  } else if (role === 'ADMIN') {
    // Admin can request specific branches or all
    const requested = req.query.branchIds as string | undefined;
    if (requested && requested.trim()) {
      req.branchFilter = requested
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (req.query.branchId) {
      // Single branchId param also accepted
      req.branchFilter = [(req.query.branchId as string).trim()];
    } else {
      req.branchFilter = []; // empty = all branches
    }
    req.isMultiBranch = req.branchFilter.length !== 1;
  } else {
    return next(new AppError('Access denied', 403));
  }

  next();
}

// Helper: build TypeORM Where clause for branch filtering
export function branchWhere(branchFilter: string[]): Record<string, unknown> {
  if (!branchFilter.length) return {};
  if (branchFilter.length === 1) return { branchId: branchFilter[0] };
  // Multiple: handled via QueryBuilder
  return {};
}

// Helper: apply branch filter to QueryBuilder (accepts any ObjectLiteral entity)

export function applyBranchQB(
  qb: { andWhere: (condition: string, params?: Record<string, unknown>) => unknown },
  alias: string,
  branchFilter: string[],
) {
  if (!branchFilter.length) return qb;
  if (branchFilter.length === 1) {
    return qb.andWhere(`${alias}.branchId = :bf`, { bf: branchFilter[0] });
  }
  return qb.andWhere(`${alias}.branchId IN (:...bf)`, { bf: branchFilter });
}
