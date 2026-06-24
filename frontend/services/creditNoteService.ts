import api from '@/lib/api';
import { CreateCreditNotePayload, UpdateCreditNotePayload } from '@/lib/invoice';
import { CompletionData } from '@/components/returns/CompletionModal';

export const getCreditNoteStats = async () => {
  return api.get('/b/credit-notes/stats');
};

export const getCreditNotes = async () => {
  return api.get('/b/credit-notes');
};

export const createCreditNote = async (data: CreateCreditNotePayload) => {
  return api.post('/b/credit-notes', data);
};

export const updateCreditNote = async (id: string, data: UpdateCreditNotePayload) => {
  return api.put(`/b/credit-notes/${id}`, data);
};

export const deleteCreditNote = async (id: string) => {
  return api.delete(`/b/credit-notes/${id}`);
};

export const sendToFinance = async (id: string) => {
  return api.post(`/b/credit-notes/${id}/send`);
};

export const approveCreditNote = async (
  id: string,
  data: { financeNote: string; damageReason: string; paymentMode: string },
) => {
  return api.post(`/b/credit-notes/${id}/approve`, data);
};

export const rejectCreditNote = async (id: string, data: { rejectionReason: string }) => {
  return api.post(`/b/credit-notes/${id}/reject`, data);
};

export const completeCreditNote = async (id: string, data: CompletionData) => {
  return api.post(`/b/credit-notes/${id}/complete`, data);
};
