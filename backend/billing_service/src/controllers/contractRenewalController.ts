import { Request, Response, NextFunction } from 'express';
import {
  getOngoingContracts,
  recordRenewalDecision,
  extendContract,
} from '../services/contractRenewalService';
import { AppError } from '../errors/appError';

export const listOngoingContracts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { branchId } = req.user!;
    const contracts = await getOngoingContracts(branchId);
    res.json({ success: true, data: contracts });
  } catch (err) {
    next(err);
  }
};

export const setRenewalDecision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId } = req.user!;
    const { decision } = req.body as { decision?: string };
    if (decision !== 'RENEWAL_APPROVED' && decision !== 'CONTRACT_ENDED') {
      throw new AppError("decision must be 'RENEWAL_APPROVED' or 'CONTRACT_ENDED'.", 400);
    }
    const invoice = await recordRenewalDecision(id, userId, decision);
    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

export const extendContractHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const { userId } = req.user!;
    const { extendByMonths } = req.body as { extendByMonths?: number };
    const result = await extendContract(id, userId, Number(extendByMonths));
    res.json({ success: true, data: result.invoice, warning: result.warning });
  } catch (err) {
    next(err);
  }
};
