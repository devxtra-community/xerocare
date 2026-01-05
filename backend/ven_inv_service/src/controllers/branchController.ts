import { Request, Response } from 'express';
import { BranchService } from '../services/branchService';

export class BranchController {
  constructor(private readonly service: BranchService) {}

  create = async (req: Request, res: Response) => {
    const branch = await this.service.createBranch(req.body);
    res.status(201).json({ success: true, data: branch });
  };

  list = async (_req: Request, res: Response) => {
    const branches = await this.service.getBranches();
    res.json({ success: true, data: branches });
  };

  update = async (req: Request, res: Response) => {
    await this.service.updateBranch(req.params.id, req.body);
    res.json({ success: true, message: 'Branch updated successfully' });
  };

  delete = async (req: Request, res: Response) => {
    await this.service.deleteBranch(req.params.id);
    res.json({ success: true, message: 'Branch deleted successfully' });
  };
}
