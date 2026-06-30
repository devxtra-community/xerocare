import { Request, Response } from 'express';
import { StockTransferService } from '../services/stockTransferService';
import { TransferStatus, TransferType } from '../entities/stockTransferEntity';
import { logger } from '../config/logger';

const service = new StockTransferService();

export const createTransfer = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const transfer = await service.createDraft(req.body, userId);
    return res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    logger.error('createTransfer error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return res.status(400).json({ success: false, message });
  }
};

export const listTransfers = async (req: Request, res: Response) => {
  try {
    const role = req.user?.role;
    const branchId = req.user?.branchId;
    const { status, transfer_type, dateFrom, dateTo, branch } = req.query as Record<string, string>;

    const targetBranch = role === 'ADMIN' ? branch || undefined : branchId;

    const transfers = await service.list({
      branchId: targetBranch,
      status: status as TransferStatus | undefined,
      transfer_type: transfer_type as TransferType | undefined,
      dateFrom,
      dateTo,
      role,
    });
    return res.json({ success: true, data: transfers });
  } catch (err) {
    logger.error('listTransfers error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const getTransfer = async (req: Request, res: Response) => {
  try {
    const transfer = await service.getById(String(req.params.id));
    if (!transfer) return res.status(404).json({ success: false, message: 'Transfer not found' });

    const role = req.user?.role;
    const branchId = req.user?.branchId;
    if (role !== 'ADMIN' && branchId) {
      const accessible =
        transfer.source_branch_id === branchId || transfer.destination_branch_id === branchId;
      if (!accessible) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }
    return res.json({ success: true, data: transfer });
  } catch (err) {
    logger.error('getTransfer error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const submitTransfer = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;
    const transfer = await service.submit(String(req.params.id), userId, branchId);
    return res.json({ success: true, data: transfer });
  } catch (err) {
    logger.error('submitTransfer error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const code = message.includes('Access denied') ? 403 : 400;
    return res.status(code).json({ success: false, message });
  }
};

export const approveTransfer = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user?.role;
    const branchId = role === 'ADMIN' ? undefined : req.user?.branchId;
    const transfer = await service.approve(String(req.params.id), userId, branchId, role);
    return res.json({ success: true, data: transfer });
  } catch (err) {
    logger.error('approveTransfer error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const code =
      message.includes('Access denied') || message.includes('Cannot approve your own') ? 403 : 400;
    return res.status(code).json({ success: false, message });
  }
};

export const rejectTransfer = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;
    const { reason } = req.body;
    if (!reason)
      return res.status(400).json({ success: false, message: 'Rejection reason required' });
    const transfer = await service.reject(String(req.params.id), userId, reason, branchId);
    return res.json({ success: true, data: transfer });
  } catch (err) {
    logger.error('rejectTransfer error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const code = message.includes('Access denied') ? 403 : 400;
    return res.status(code).json({ success: false, message });
  }
};

export const dispatchTransfer = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;
    const transfer = await service.dispatch(String(req.params.id), userId, branchId);
    return res.json({ success: true, data: transfer });
  } catch (err) {
    logger.error('dispatchTransfer error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const code = message.includes('Access denied') ? 403 : 400;
    return res.status(code).json({ success: false, message });
  }
};

export const receiveTransfer = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;
    const { items } = req.body as { items: { itemId: string; received_qty: number }[] };
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }
    const transfer = await service.receive(String(req.params.id), userId, items, branchId);
    return res.json({ success: true, data: transfer });
  } catch (err) {
    logger.error('receiveTransfer error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const code = message.includes('Access denied') ? 403 : 400;
    return res.status(code).json({ success: false, message });
  }
};

export const cancelTransfer = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const branchId = req.user?.role === 'ADMIN' ? undefined : req.user?.branchId;
    const transfer = await service.cancel(String(req.params.id), userId, branchId);
    return res.json({ success: true, data: transfer });
  } catch (err) {
    logger.error('cancelTransfer error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const code = message.includes('Access denied') ? 403 : 400;
    return res.status(code).json({ success: false, message });
  }
};

export const getPendingCount = async (req: Request, res: Response) => {
  try {
    const role = req.user!.role;
    const branchId = req.user?.branchId;
    if (role !== 'ADMIN' && !branchId) {
      return res.status(400).json({ success: false, message: 'Branch context missing' });
    }
    const count = await service.getPendingCount(branchId ?? '', role);
    return res.json({ success: true, data: { count } });
  } catch (err) {
    logger.error('getPendingCount error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
