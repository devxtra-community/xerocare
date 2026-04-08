import api from './api';

export enum RfqStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL_QUOTED = 'PARTIAL_QUOTED',
  FULLY_QUOTED = 'FULLY_QUOTED',
  AWARDED = 'AWARDED',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED',
}

export enum ItemType {
  PRODUCT = 'PRODUCT',
  SPARE_PART = 'SPARE_PART',
}

export interface RfqItem {
  id?: string;
  itemType: ItemType;
  modelId?: string;
  productId?: string;
  brandId?: string;
  sparePartId?: string;
  customProductName?: string;
  customSparePartName?: string;
  customBrandName?: string;
  hsCode?: string;
  mpn?: string;
  compatibleModels?: string;
  modelIds?: string[];
  description?: string;
  quantity: number;
  expectedDeliveryDate?: string;
}

export interface Rfq {
  id: string;
  rfq_number: string;
  branch_id: string;
  status: RfqStatus;
  created_at: string;
  items: Record<string, unknown>[];
  vendors: Record<string, unknown>[];
  creator?: Record<string, unknown>;
}

export async function createRfq(data: { vendorIds: string[]; items: RfqItem[] }) {
  const res = await api.post('/i/rfq/', data);
  return res.data;
}

export async function uploadRfqExcel(data: { vendorIds: string[]; file: File }) {
  const formData = new FormData();
  formData.append('file', data.file);
  formData.append('vendorIds', JSON.stringify(data.vendorIds));

  const res = await api.post('/i/rfq/upload-items', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function getRfqs() {
  const res = await api.get('/i/rfq/');
  return res.data.data;
}

export async function getRfqById(id: string) {
  const res = await api.get(`/i/rfq/${id}`);
  return res.data.data;
}

export async function sendRfq(id: string) {
  const res = await api.post(`/i/rfq/${id}/send`);
  return res.data;
}

export async function uploadExcelQuote(id: string, vendorId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post(`/i/rfq/${id}/quote/excel/${vendorId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
}

export async function getRfqComparison(id: string) {
  const res = await api.get(`/i/rfq/${id}/comparison`);
  return res.data.data;
}

export async function awardVendor(id: string, vendorId: string) {
  const res = await api.post(`/i/rfq/${id}/award/${vendorId}`);
  return res.data;
}

export async function createLotFromRfq(id: string, warehouseId?: string) {
  const res = await api.post(`/i/rfq/${id}/create-lot`, { warehouseId });
  return res.data;
}

export async function downloadRfqExcel(id: string, rfqNumber: string) {
  const res = await api.get(`/i/rfq/${id}/download-excel`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${rfqNumber}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadVendorQuote(id: string, vendorId: string, vendorName: string) {
  const res = await api.get(`/i/rfq/${id}/quote/excel/${vendorId}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Quote_${vendorName}_${id.slice(0, 8)}.xlsx`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
