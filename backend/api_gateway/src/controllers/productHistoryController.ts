import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

const VEN_INV_URL = process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://127.0.0.1:3003';
const BILLING_URL = process.env.BILLING_SERVICE_URL || 'http://127.0.0.1:3004';

export type HistoryEventType =
  | 'RECEIVED'
  | 'ALLOCATED'
  | 'DEALLOCATED'
  | 'REPLACED'
  | 'SERVICE_TICKET'
  | 'USAGE_RECORD';

export interface HistoryEvent {
  type: HistoryEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export const getProductHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const token = req.headers.authorization || '';

    const headers = { Authorization: token };

    const invRes = await axios
      .get<{
        data: {
          product: Record<string, unknown>;
          machineHistory: Record<string, unknown> | null;
          tickets: Record<string, unknown>[];
        };
      }>(`${VEN_INV_URL}/products/${id}/history-data`, { headers })
      .catch(() => null);

    if (!invRes) {
      throw new AppError('Failed to fetch product data', 502);
    }

    const { product, machineHistory, tickets } = invRes.data.data;
    const serialNumber = (product as { serial_no?: string }).serial_no || '';

    // Now fetch billing data using productId + serialNumber fallback
    let allocations: Record<string, unknown>[] = [];
    let usageRecords: Record<string, unknown>[] = [];
    try {
      const billingData = await axios.get<{
        data: { allocations: Record<string, unknown>[]; usageRecords: Record<string, unknown>[] };
      }>(
        `${BILLING_URL}/invoices/machine/${id}/history-data?serialNumber=${encodeURIComponent(serialNumber)}`,
        {
          headers,
        },
      );
      allocations = billingData.data.data.allocations;
      usageRecords = billingData.data.data.usageRecords;
    } catch (billingErr) {
      logger.warn(`Failed to fetch billing history for product ${id}`, billingErr);
    }

    const events: HistoryEvent[] = [];

    // RECEIVED event — from lot
    const lot = (
      product as { lot?: { lotNumber?: string; purchaseDate?: string }; created_at?: string }
    ).lot;
    events.push({
      type: 'RECEIVED',
      timestamp:
        (lot as { purchaseDate?: string } | undefined)?.purchaseDate ||
        (product as { created_at?: string }).created_at ||
        new Date().toISOString(),
      data: {
        lotNumber: (lot as { lotNumber?: string } | undefined)?.lotNumber || null,
        vendor: (product as { vendor?: { name?: string } }).vendor?.name || null,
        warehouse:
          (product as { warehouse?: { warehouseName?: string } }).warehouse?.warehouseName || null,
      },
    });

    // ALLOCATED / DEALLOCATED / REPLACED events from billing allocations
    for (const alloc of allocations) {
      const a = alloc as {
        startTimestamp: string;
        endTimestamp: string | null;
        status: string;
        contractId: string;
        invoiceNumber: string;
        billType: string;
        customerId: string | null;
        replacementReason: string | null;
      };

      events.push({
        type: 'ALLOCATED',
        timestamp: a.startTimestamp,
        data: {
          contractId: a.contractId,
          invoiceNumber: a.invoiceNumber,
          billType: a.billType,
          customerId: a.customerId,
        },
      });

      if (a.endTimestamp) {
        events.push({
          type: a.status === 'REPLACED' ? 'REPLACED' : 'DEALLOCATED',
          timestamp: a.endTimestamp,
          data: {
            contractId: a.contractId,
            invoiceNumber: a.invoiceNumber,
            reason: a.replacementReason || null,
          },
        });
      }
    }

    // SERVICE_TICKET events
    for (const ticket of tickets) {
      const t = ticket as {
        created_at: string;
        ticketNumber: string;
        status: string;
        issueDescription: string;
        serviceContext: string;
        assignedTechnicianId: string | null;
        completedAt: string | null;
      };
      events.push({
        type: 'SERVICE_TICKET',
        timestamp: t.created_at,
        data: {
          ticketNumber: t.ticketNumber,
          status: t.status,
          issueDescription: t.issueDescription,
          serviceContext: t.serviceContext,
          technicianId: t.assignedTechnicianId,
          completedAt: t.completedAt,
        },
      });
    }

    // USAGE_RECORD events
    for (const ur of usageRecords) {
      const u = ur as {
        createdAt: string;
        contractId: string;
        billingPeriodStart: string;
        billingPeriodEnd: string;
        bwA4Delta: number;
        bwA3Delta: number;
        colorA4Delta: number;
        colorA3Delta: number;
        totalCharge: number;
      };
      events.push({
        type: 'USAGE_RECORD',
        timestamp: u.createdAt,
        data: {
          contractId: u.contractId,
          billingPeriodStart: u.billingPeriodStart,
          billingPeriodEnd: u.billingPeriodEnd,
          bwCopies: (u.bwA4Delta || 0) + (u.bwA3Delta || 0),
          colorCopies: (u.colorA4Delta || 0) + (u.colorA3Delta || 0),
          totalCharge: u.totalCharge,
        },
      });
    }

    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return res.status(200).json({
      success: true,
      data: {
        product,
        machineHistory,
        events,
      },
    });
  } catch (err) {
    next(err);
  }
};
