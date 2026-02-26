import { Request, Response } from 'express';
import { BranchService } from '../services/branchService';

export class BranchController {
  constructor(private readonly service: BranchService) {}

  /**
   * Creates a new branch.
   */
  create = async (req: Request, res: Response) => {
    const branch = await this.service.createBranch(req.body);
    res.status(201).json({ success: true, data: branch });
  };

  /**
   * Lists all branches.
   */
  list = async (req: Request, res: Response) => {
    const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;

    if (branchId) {
      const branch = await this.service.getBranchById(branchId);
      return res.json({ success: true, data: branch ? [branch] : [] });
    }

    const branches = await this.service.getBranches();
    res.json({ success: true, data: branches });
  };

  /**
   * Retrieves a branch by ID.
   */
  getById = async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;

    if (branchId && branchId !== id) {
      return res
        .status(403)
        .json({ success: false, message: 'Access denied: Cannot access other branch details' });
    }

    const branch = await this.service.getBranchById(id);
    res.json({ success: true, data: branch });
  };

  /**
   * Updates a branch.
   */
  update = async (req: Request, res: Response) => {
    await this.service.updateBranch(req.params.id as string, req.body);
    res.json({ success: true, message: 'Branch updated successfully' });
  };

  /**
   * Soft deletes a branch.
   */
  delete = async (req: Request, res: Response) => {
    await this.service.deleteBranch(req.params.id as string);
    res.json({ success: true, message: 'Branch deleted successfully' });
  };

  /**
   * Retrieves the current user's branch.
   */
  getMyBranch = async (req: Request, res: Response) => {
    const branchId = req.user?.branchId;
    if (!branchId) {
      res.status(400).json({ success: false, message: 'Branch ID not found in token' });
      return;
    }
    const branch = await this.service.getBranchById(branchId);
    res.json({ success: true, data: branch });
  };
}
