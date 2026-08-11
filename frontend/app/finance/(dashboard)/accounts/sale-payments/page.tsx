import { redirect } from 'next/navigation';

export default function FinanceSalePaymentsPage() {
  redirect('/finance/accounts/receivable?tab=receipts');
}
