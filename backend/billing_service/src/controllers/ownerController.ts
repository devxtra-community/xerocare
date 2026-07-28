import { Request, Response, NextFunction } from 'express';
import { Source } from '../config/dataSource';
import { Owner } from '../entities/ownerEntity';
import { AppError } from '../errors/appError';

// Owners/Shareholders/Partners — a small, company-wide reference list (not
// branch-scoped) used by the Equity form's Share Capital / Owner Contribution
// / Dividend / Withdrawal types. See ownerEntity.ts for why this isn't
// branch-scoped.

export const getOwners = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const repo = Source.getRepository(Owner);
    const includeInactive = req.query.includeInactive === 'true';
    const owners = await repo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
    res.json({ success: true, data: owners });
  } catch (err) {
    next(err);
  }
};

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
    owner.isActive = false;
    await repo.save(owner);
    res.json({ success: true, message: 'Owner deactivated' });
  } catch (err) {
    next(err);
  }
};
