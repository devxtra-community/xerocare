import EmployeeProfile from '@/components/AdminDahboardComponents/hrComponents/EmployeeProfile';

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  return <EmployeeProfile id={params.id} />;
}
