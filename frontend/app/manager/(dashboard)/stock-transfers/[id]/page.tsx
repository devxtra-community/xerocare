'use client';
import { useParams } from 'next/navigation';
import TransferDetail from '@/components/stockTransferComponents/TransferDetail';

export default function ManagerTransferDetailPage() {
  const params = useParams();
  const id = String(params.id);
  return <TransferDetail transferId={id} role="manager" />;
}
