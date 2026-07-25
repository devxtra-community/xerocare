import api from '../api';
import { RENT_PLAN_TYPES, type RentPlanType } from './accountsApi';

const BASE = '/b/accounts';

export type CostBasis = 'ACTUAL' | 'APPROXIMATE' | 'UNAVAILABLE';

export interface SegmentPnl {
  key: string;
  label: string;
  topCategory: 'SALE' | 'RENT' | 'LEASE';
  revenue: number;
  directCost: number;
  directCostBasis: CostBasis;
  directCostNote: string;
  grossProfit: number;
  allocatedOverhead: number;
  netProfit: number;
  grossMarginPct: number | null;
  netMarginPct: number | null;
  invoiceIds: string[];
}

export interface SegmentedPnlResult {
  segments: SegmentPnl[];
  totalRevenue: number;
  totalDirectCost: number;
  totalGrossProfit: number;
  totalAllocatedOverhead: number;
  totalNetProfit: number;
  overheadPool: number;
  currency: string;
  currencyWarnings: string[];
  dataWarnings: string[];
  periodFrom: string;
  periodTo: string;
}

export const fetchSegmentedPnl = (params: {
  periodFrom?: string;
  periodTo?: string;
  branchId?: string;
  branchIds?: string;
}) =>
  api
    .get<{ success: boolean; data: SegmentedPnlResult }>(`${BASE}/segmented-pnl`, { params })
    .then((r) => r.data.data);

export interface ProductSaleRow {
  invoiceItemId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  date: string;
  productId: string | null;
  sparePartId: string | null;
  itemLabel: string;
  serialNumber: string | null;
  quantity: number;
  revenue: number;
  cost: number;
  costBasis: CostBasis;
  profit: number;
}

export const fetchSegmentProductDetail = (params: {
  segmentKey: 'PRODUCT_SALE' | 'SPAREPART_SALE';
  periodFrom?: string;
  periodTo?: string;
  branchId?: string;
  branchIds?: string;
}) =>
  api
    .get<{ success: boolean; data: ProductSaleRow[] }>(`${BASE}/segmented-pnl/products`, {
      params,
    })
    .then((r) => r.data.data);

export interface ContractPnlRow {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  revenue: number;
  productId: string | null;
  machineLabel: string | null;
  serialNumber: string | null;
  directCost: number;
  costBasis: CostBasis;
  profit: number;
  note: string;
}

export const fetchSegmentContractDetail = (params: {
  segmentKey: string;
  periodFrom?: string;
  periodTo?: string;
  branchId?: string;
  branchIds?: string;
}) =>
  api
    .get<{ success: boolean; data: ContractPnlRow[] }>(`${BASE}/segmented-pnl/contracts`, {
      params,
    })
    .then((r) => r.data.data);

// Maps a SegmentPnl.key + topCategory to the category string
// getRevenueTransactions/fetchRevenueTransactions expects — see
// backend/billing_service/src/controllers/revenueBreakdownController.ts's
// parseCategory(). Kept here (not duplicated) so the "View Source" (revenue)
// action on every segment reuses the exact same drill-down the Chart of
// Accounts Revenue section already has, rather than a second implementation.
export function segmentToRevenueCategory(segment: Pick<SegmentPnl, 'key' | 'topCategory'>): string {
  if (segment.key === 'PRODUCT_SALE' || segment.key === 'SPAREPART_SALE') return segment.key;
  if (segment.topCategory === 'RENT') return `RENT_${segment.key}`;
  if (segment.key === 'EMI') return 'LEASE_EMI';
  return `LEASE_${segment.key}`; // key already FSM_<planType>
}

export const SEGMENT_RENT_KEYS: RentPlanType[] = [...RENT_PLAN_TYPES];
