import ManagerQuotationTemplateTable from '@/components/ManagerDashboardComponents/salesComponents/ManagerQuotationTemplateTable';

export default function ManagerTemplatesPage() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
        <ManagerQuotationTemplateTable />
      </div>
    </div>
  );
}
