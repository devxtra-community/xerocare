import StatCard from '@/components/StatCard';
import DashbordTable from '@/components/ManagerDashboardComponents/dashboardComponents/productTable';
import BranchSalesChart from '@/components/ManagerDashboardComponents/dashboardComponents/branchsalesChart';

export default function Dashboard() {
  return (
    <div className="bg-blue-100 min-h-full p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8">
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-primary">Branch Sales</h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard title="Today Sales" value="73,000" subtitle="Daily sales details and reports" />
          <StatCard title="Pending Orders" value="27" subtitle="Today pending order count" />
          <StatCard
            title="Today Revenue / Profit"
            value="42,000"
            subtitle="Daily income and revenue"
          />
          <StatCard title="Damaged Items" value="8" subtitle="Damaged product details" />
        </div>

        <div className="space-y-3">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Outlet Inventory</h3>
          <DashbordTable />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg sm:text-xl font-bold text-primary">Branch Sales Overview</h3>
        <BranchSalesChart />
      </div>
    </div>
  );
}
