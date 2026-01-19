import EmployeeProfile from '@/components/AdminDashboardComponents/hrComponents/EmployeeProfile';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeProfile id={id} />;
}
