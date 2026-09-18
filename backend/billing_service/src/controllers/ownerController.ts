import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { Owner } from '../entities/ownerEntity';
import { AppError } from '../errors/appError';

// Owners/Shareholders/Partners — the reference list behind the Equity form's Share
// Capital / Owner Contribution / Dividend / Withdrawal types, and the Cash & Bank opening
// balance form.
//
// Scoped to the caller's branch. This list used to be company-wide, so a contributor
// created in Branch A appeared in Branch B's selector and a contribution could be posted
// against an owner from another branch. See ownerEntity.ts.

export const getOwners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(Owner);
    const includeInactive = req.query.includeInactive === 'true';
    const branchFilter = resolveOwnerBranchFilter(req);

    const qb = repo.createQueryBuilder('o');
    if (!includeInactive) qb.andWhere('o.isActive = :active', { active: true });
    if (branchFilter.length > 0) {
      // Legacy rows with no branch stay visible: they pre-date branch scoping and could
      // not be attributed to one branch, so hiding them would make owners referenced by
      // real equity entries unselectable. Every owner created from now on carries a branch.
      qb.andWhere('(o."branchId" IN (:...branchIds) OR o."branchId" IS NULL)', {
        branchIds: branchFilter,
      });
    }
    qb.orderBy('o.name', 'ASC');
    const owners = await qb.getMany();
    res.json({ success: true, data: owners });
  } catch (err) {
    next(err);
  }
};

/**
 * Branches this request may see owners for.
 *
 * `req.branchFilter` is set by parseBranchFilter on the accounts routes (empty for an
 * ADMIN viewing everything). Falling back to the caller's own branch matters: without it
 * a non-admin whose filter was empty would see every branch's owners again, which is the
 * leak this is fixing.
 */
function resolveOwnerBranchFilter(req: Request): string[] {
  const filter = req.branchFilter ?? [];
  if (filter.length > 0) return filter;
  const own = req.user?.branchId;
  // ADMIN has no fixed branch and is allowed the company-wide list.
  if (req.user?.role === 'ADMIN') return [];
  return own ? [own] : [];
}

/** The branch a newly created owner belongs to, taken from the caller — never the body. */
function resolveOwnerBranchId(req: Request): string | undefined {
  return req.user?.branchId ?? req.branchFilter?.[0] ?? undefined;
}

/** Refuses to touch an owner belonging to another branch. */
function assertOwnerInScope(req: Request, owner: Owner): void {
  const filter = resolveOwnerBranchFilter(req);
  if (filter.length === 0) return; // ADMIN / company-wide scope
  if (owner.branchId && !filter.includes(owner.branchId)) {
    throw new AppError('This owner belongs to another branch', 403);
  }
}

export const createOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, phone, ownershipPercent, notes } = req.body;
    if (!name || !String(name).trim()) {
      throw new AppError('Owner name is required', 400);
    }
    const repo = Source.getRepository(Owner);
    const owner = repo.create({
      name: String(name).trim(),
      email: email || undefined,
      phone: phone || undefined,
      ownershipPercent: ownershipPercent != null ? Number(ownershipPercent) : undefined,
      notes: notes || undefined,
      isActive: true,
      // From the caller's own branch, never from the request body — the same rule the
      // rest of the accounts module follows.
      branchId: resolveOwnerBranchId(req),
    });
    const saved = await repo.save(owner);
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

export const updateOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(Owner);
    const owner = await repo.findOne({ where: { id: req.params.id as string } });
    if (!owner) throw new AppError('Owner not found', 404);
    assertOwnerInScope(req, owner);

    const { name, email, phone, ownershipPercent, notes, isActive } = req.body;
    if (name !== undefined) owner.name = String(name).trim();
    if (email !== undefined) owner.email = email || undefined;
    if (phone !== undefined) owner.phone = phone || undefined;
    if (ownershipPercent !== undefined)
      owner.ownershipPercent = ownershipPercent != null ? Number(ownershipPercent) : undefined;
    if (notes !== undefined) owner.notes = notes || undefined;
    if (isActive !== undefined) owner.isActive = !!isActive;

    const saved = await repo.save(owner);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

// No hard delete — an Owner referenced by past Equity entries must stay
// resolvable for historical display. "Deleting" an owner deactivates them
// instead (excluded from the selector, existing entries unaffected).
export const deactivateOwner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(Owner);
    const owner = await repo.findOne({ where: { id: req.params.id as string } });
    if (!owner) throw new AppError('Owner not found', 404);
    assertOwnerInScope(req, owner);
    owner.isActive = false;
    await repo.save(owner);
    res.json({ success: true, message: 'Owner deactivated' });
  } catch (err) {
    next(err);
  }
};
