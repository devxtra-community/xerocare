import { Request, Response } from 'express';
import { stockTransferService } from '../services/stockTransferService';

export const createTransfer = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const branchId = req.user!.branchId || req.body.requesting_branch_id;
    if (!branchId) return res.status(400).json({ success: false, message: 'Branch ID required' });

    const transfer = await stockTransferService.createDraft(req.body, userId, branchId);
    res.status(201).json({ success: true, data: transfer });
  } catch (err: unknown) {
    res
      .status(400)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const submitTransfer = async (req: Request, res: Response) => {
  try {
    const { userId, branchId, role } = req.user!;
    const transfer = await stockTransferService.submit(
      String(req.params.id),
      userId,
      branchId || '',
      role,
    );
    res.json({ success: true, data: transfer });
  } catch (err: unknown) {
    res
      .status(400)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const respondTransfer = async (req: Request, res: Response) => {
  try {
    const { userId, branchId, role } = req.user!;
    const transfer = await stockTransferService.respond(
      String(req.params.id),
      userId,
      branchId || '',
      role,
      req.body,
    );
    res.json({ success: true, data: transfer });
  } catch (err: unknown) {
    res
      .status(400)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const dispatchTransfer = async (req: Request, res: Response) => {
  try {
    const { userId, branchId, role } = req.user!;
    const transfer = await stockTransferService.dispatch(
      String(req.params.id),
      userId,
      branchId || '',
      role,
    );
    res.json({ success: true, data: transfer });
  } catch (err: unknown) {
    res
      .status(400)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const receiveTransfer = async (req: Request, res: Response) => {
  try {
    const { userId, branchId, role } = req.user!;
    const transfer = await stockTransferService.receive(
      String(req.params.id),
      userId,
      branchId || '',
      role,
      req.body,
    );
    res.json({ success: true, data: transfer });
  } catch (err: unknown) {
    res
      .status(400)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const cancelTransfer = async (req: Request, res: Response) => {
  try {
    const { userId, branchId, role } = req.user!;
    const transfer = await stockTransferService.cancel(
      String(req.params.id),
      userId,
      branchId || '',
      role,
    );
    res.json({ success: true, data: transfer });
  } catch (err: unknown) {
    res
      .status(400)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const listTransfers = async (req: Request, res: Response) => {
  try {
    const { userId, branchId, role } = req.user!;
    const { status, transfer_type, search } = req.query as Record<string, string>;
    const transfers = await stockTransferService.list(userId, branchId, role, {
      status,
      transfer_type,
      search,
    });
    res.json({ success: true, data: transfers });
  } catch (err: unknown) {
    res
      .status(500)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getTransfer = async (req: Request, res: Response) => {
  try {
    const transfer = await stockTransferService.getById(String(req.params.id));
    res.json({ success: true, data: transfer });
  } catch (err: unknown) {
    res
      .status(404)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getPendingCount = async (req: Request, res: Response) => {
  try {
    const { branchId, role } = req.user!;
    const count = await stockTransferService.getPendingCount(branchId, role);
    res.json({ success: true, data: { count } });
  } catch (err: unknown) {
    res
      .status(500)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};

export const getBranchInventoryForTransfer = async (req: Request, res: Response) => {
  try {
    const branchId = String(req.params.branchId);
    const [inventory, products] = await Promise.all([
      stockTransferService.getBranchInventory(branchId),
      stockTransferService.getBranchProducts(branchId),
    ]);
    res.json({ success: true, data: { inventory, products } });
  } catch (err: unknown) {
    res
      .status(500)
      .json({ success: false, message: err instanceof Error ? err.message : 'Unknown error' });
  }
};
