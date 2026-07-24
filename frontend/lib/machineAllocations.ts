import type { CustomerServiceHistory, WarrantyInfo } from './serviceTicket';
import type { Model } from './model';
import type { ServiceContract } from './serviceContract';

export interface HistoryItem {
  id: string;
  productId?: string;
  modelId?: string;
  serialNumber?: string;
  description?: string;
}

export interface HistoryAllocation {
  id: string;
  productId?: string;
  modelId?: string;
  serialNumber?: string;
  currentBwA4?: number;
  currentBwA3?: number;
  currentColorA4?: number;
  currentColorA3?: number;
  warrantyInfo?: WarrantyInfo;
}

export interface HistoryInvoice {
  id: string;
  invoiceNumber?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  monthlyRent?: number;
  contractStatus?: string;
  leaseTenureMonths?: number;
  maxCopyLimit?: number;
  createdAt?: string;
  productAllocations?: HistoryAllocation[];
  items?: HistoryItem[];
  totalAmount?: number;
  status?: string;
}

export interface MachineAllocation {
  id: string;
  modelName: string;
  serialNumber: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  monthlyRent?: number;
  contractStatus?: string;
  contractReferenceId?: string;
  invoiceNumber?: string;
  type: string;
  expiredFirst?: string;
  brandName?: string;
  isUnderWarranty?: boolean;
  remainingTime?: string;
  remainingCopies?: string;
  purchaseDate?: string;
  contractType?: string;
  meterReading?: number;
  warrantyInfo?: WarrantyInfo;
}

/**
 * Derives display fields from the server-computed warrantyInfo
 * (single source of truth — no client-side warranty math).
 */
export function warrantyDisplayFields(w?: WarrantyInfo) {
  if (!w) {
    return {
      isUnderWarranty: false,
      remainingTime: 'N/A',
      remainingCopies: 'N/A',
      expiredFirst: '',
      effectiveTo: undefined as string | undefined,
    };
  }
  let remainingTime = 'N/A';
  if (w.warrantyEndDate) {
    const currentDate = new Date();
    const diffMs = new Date(w.warrantyEndDate).getTime() - currentDate.getTime();
    const diffMonths = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30));
    remainingTime = diffMonths > 0 ? `${diffMonths} months left` : 'Expired';
  }
  return {
    isUnderWarranty: w.isUnderWarranty,
    remainingTime,
    remainingCopies:
      w.copiesRemaining != null ? `${w.copiesRemaining.toLocaleString()} copies left` : 'N/A',
    expiredFirst: w.expiredBy || '',
    effectiveTo: w.warrantyEndDate
      ? new Date(w.warrantyEndDate).toISOString().split('T')[0]
      : undefined,
  };
}

export function getRentedMachines(
  history: CustomerServiceHistory | null,
  models: Model[],
): MachineAllocation[] {
  if (!history?.billingHistory?.RENT) return [];
  const list: MachineAllocation[] = [];
  history.billingHistory.RENT.forEach((invObj) => {
    const inv = invObj as HistoryInvoice;
    const allocations = inv.productAllocations || [];
    if (allocations.length > 0) {
      allocations.forEach((alloc) => {
        const matchedModel = models.find((m) => m.id === alloc.modelId);
        list.push({
          id: alloc.productId || alloc.id,
          modelName: matchedModel
            ? matchedModel.model_name
            : inv.items?.find((i) => i.modelId === alloc.modelId)?.description || 'Rented Printer',
          serialNumber: alloc.serialNumber || 'N/A',
          effectiveFrom: inv.effectiveFrom,
          effectiveTo: inv.effectiveTo,
          monthlyRent: inv.monthlyRent || 0,
          contractStatus: inv.contractStatus || 'ACTIVE',
          contractReferenceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          type: 'RENT',
        });
      });
    } else {
      (inv.items || []).forEach((item) => {
        if (item.serialNumber || item.modelId) {
          const matchedModel = models.find((m) => m.id === item.modelId);
          list.push({
            id: item.productId || item.id,
            modelName: matchedModel
              ? matchedModel.model_name
              : item.description || 'Rented Printer',
            serialNumber: item.serialNumber || 'N/A',
            effectiveFrom: inv.effectiveFrom,
            effectiveTo: inv.effectiveTo,
            monthlyRent: inv.monthlyRent || 0,
            contractStatus: inv.contractStatus || 'ACTIVE',
            contractReferenceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            type: 'RENT',
          });
        }
      });
    }
  });
  return list;
}

export function getLeasedMachines(
  history: CustomerServiceHistory | null,
  models: Model[],
): MachineAllocation[] {
  if (!history?.billingHistory?.LEASE) return [];
  const list: MachineAllocation[] = [];
  history.billingHistory.LEASE.forEach((invObj) => {
    const inv = invObj as HistoryInvoice;
    const allocations = inv.productAllocations || [];
    if (allocations.length > 0) {
      allocations.forEach((alloc) => {
        const matchedModel = models.find((m) => m.id === alloc.modelId);
        const w = warrantyDisplayFields(alloc.warrantyInfo);
        list.push({
          id: alloc.productId || alloc.id,
          modelName: matchedModel
            ? matchedModel.model_name
            : inv.items?.find((i) => i.modelId === alloc.modelId)?.description || 'Leased Printer',
          serialNumber: alloc.serialNumber || 'N/A',
          effectiveFrom: inv.effectiveFrom,
          effectiveTo: w.effectiveTo,
          isUnderWarranty: w.isUnderWarranty,
          remainingTime: w.remainingTime,
          remainingCopies: w.remainingCopies,
          expiredFirst: w.expiredFirst,
          warrantyInfo: alloc.warrantyInfo,
          contractReferenceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          type: 'LEASE',
        });
      });
    } else {
      (inv.items || []).forEach((item) => {
        if (item.serialNumber || item.modelId) {
          const matchedModel = models.find((m) => m.id === item.modelId);
          const start = new Date(inv.effectiveFrom || '');
          const tenureMonths = inv.leaseTenureMonths || 0;
          const expiryDate = new Date(start.setMonth(start.getMonth() + tenureMonths));
          const currentDate = new Date();
          const isTimeValid = currentDate <= expiryDate;

          const maxCopies = inv.maxCopyLimit || 0;
          const isUnderWarranty = isTimeValid;
          const expiredFirst = !isTimeValid ? 'TIME' : '';
          const diffTime = expiryDate.getTime() - currentDate.getTime();
          const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
          const remainingTimeStr = diffMonths > 0 ? `${diffMonths} months left` : 'Expired';

          list.push({
            id: item.productId || item.id,
            modelName: matchedModel
              ? matchedModel.model_name
              : item.description || 'Leased Printer',
            serialNumber: item.serialNumber || 'N/A',
            effectiveFrom: inv.effectiveFrom,
            effectiveTo: expiryDate.toISOString().split('T')[0],
            isUnderWarranty,
            remainingTime: remainingTimeStr,
            remainingCopies: maxCopies > 0 ? `${maxCopies.toLocaleString()} copies max` : 'N/A',
            expiredFirst,
            contractReferenceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            type: 'LEASE',
          });
        }
      });
    }
  });
  return list;
}

export function getPurchasedMachines(
  history: CustomerServiceHistory | null,
  models: Model[],
): MachineAllocation[] {
  if (!history?.billingHistory?.SALE) return [];
  const list: MachineAllocation[] = [];
  history.billingHistory.SALE.forEach((invObj) => {
    const inv = invObj as HistoryInvoice;
    const allocations = inv.productAllocations || [];
    if (allocations.length > 0) {
      allocations.forEach((alloc) => {
        const matchedModel = models.find((m) => m.id === alloc.modelId);
        const w = warrantyDisplayFields(alloc.warrantyInfo);
        list.push({
          id: alloc.productId || alloc.id,
          modelName: matchedModel
            ? matchedModel.model_name
            : inv.items?.find((i) => i.modelId === alloc.modelId)?.description ||
              'Purchased Printer',
          serialNumber: alloc.serialNumber || 'N/A',
          purchaseDate: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A',
          invoiceNumber: inv.invoiceNumber,
          contractReferenceId: inv.id,
          isUnderWarranty: w.isUnderWarranty,
          remainingTime: w.remainingTime,
          remainingCopies: w.remainingCopies,
          expiredFirst: w.expiredFirst,
          effectiveTo: w.effectiveTo,
          warrantyInfo: alloc.warrantyInfo,
          type: 'SALE',
        });
      });
    } else {
      (inv.items || []).forEach((item) => {
        if (item.serialNumber || item.modelId) {
          const matchedModel = models.find((m) => m.id === item.modelId);
          list.push({
            id: item.productId || item.id,
            modelName: matchedModel
              ? matchedModel.model_name
              : item.description || 'Purchased Printer',
            serialNumber: item.serialNumber || 'N/A',
            purchaseDate: inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : 'N/A',
            invoiceNumber: inv.invoiceNumber,
            contractReferenceId: inv.id,
            type: 'SALE',
          });
        }
      });
    }
  });
  return list;
}

export function getExternalMachines(
  history: CustomerServiceHistory | null,
  activeContracts: ServiceContract[],
): MachineAllocation[] {
  if (!history?.assignedProducts) return [];
  const list: MachineAllocation[] = [];
  history.assignedProducts.forEach((prod) => {
    if (prod.ownership === 'EXTERNAL') {
      // AMC/SMA/FSMA contracts live in their own table, not in billing
      // history — overlay them so coverage is visible before selection.
      const contract = activeContracts.find(
        (c) =>
          c.productId === prod.id ||
          (!!c.machine?.serialNumber && c.machine.serialNumber === prod.serial_no),
      );
      list.push({
        id: prod.id,
        modelName: prod.name,
        serialNumber: prod.serial_no,
        brandName: prod.brand,
        type: 'EXTERNAL',
        meterReading: prod.meter_reading || 0,
        contractType: contract?.contractType,
        contractReferenceId: contract?.id,
        effectiveTo: contract?.endDate,
      });
    }
  });
  return list;
}

export function getContractMachines(
  history: CustomerServiceHistory | null,
  models: Model[],
): MachineAllocation[] {
  const list: MachineAllocation[] = [];
  const contractTypes = ['AMC', 'FSMA', 'SMA'];
  contractTypes.forEach((cType) => {
    const invs = history?.billingHistory?.[cType] || [];
    invs.forEach((invObj) => {
      const inv = invObj as HistoryInvoice;
      const allocations = inv.productAllocations || [];
      if (allocations.length > 0) {
        allocations.forEach((alloc) => {
          const matchedModel = models.find((m) => m.id === alloc.modelId);
          list.push({
            id: alloc.productId || alloc.id,
            modelName: matchedModel
              ? matchedModel.model_name
              : inv.items?.find((i) => i.modelId === alloc.modelId)?.description ||
                `${cType} Printer`,
            serialNumber: alloc.serialNumber || 'N/A',
            contractType: cType,
            effectiveTo: inv.effectiveTo,
            contractReferenceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            type: cType,
          });
        });
      } else {
        (inv.items || []).forEach((item) => {
          if (item.serialNumber || item.modelId) {
            const matchedModel = models.find((m) => m.id === item.modelId);
            list.push({
              id: item.productId || item.id,
              modelName: matchedModel
                ? matchedModel.model_name
                : item.description || `${cType} Printer`,
              serialNumber: item.serialNumber || 'N/A',
              contractType: cType,
              effectiveTo: inv.effectiveTo,
              contractReferenceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              type: cType,
            });
          }
        });
      }
    });
  });
  return list;
}
