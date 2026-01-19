import StatCard from '@/components/StatCard';
import ProductsTable from '@/components/AdminDashboardComponents/dashboardComponents/productTable';
import HrTable from '@/components/AdminDashboardComponents/dashboardComponents/HrTable';
import SalesChart from '@/components/AdminDashboardComponents/dashboardComponents/SalesChart';
import EmployeePieChart from '@/components/AdminDashboardComponents/dashboardComponents/employeesPiechart';
import WarehouseTable from '@/components/AdminDashboardComponents/dashboardComponents/WarehouseTable';
import CategoryPieChart from '@/components/AdminDashboardComponents/dashboardComponents/CategoryPieChart';

export default function Dashboard() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* <h3 className="text-xl sm:text-2xl md:text-2xl font-bold text-primary">
        Welcome, Riyas!
      </h3> */}

      <div className="flex flex-col space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-m font-bold text-primary">Sales</h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard title="Total Earnings" value="100.000" subtitle="1 month indicator" />
          <StatCard
            title="Total Number Of Products Sold"
            value="3400"
            subtitle="1 month indicator"
          />
          <StatCard title="Best Selling Model" value="Electronics" subtitle="1 month indicator" />
          <StatCard
            title="Best Selling Product"
            value="Iphone 15 Pro"
            subtitle="1 month indicator"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary">Products</h3>
            <ProductsTable />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-primary">
              Sales Overview
            </h3>
            <SalesChart />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-xl font-bold text-primary">Human Resources</h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <HrTable />
          </div>
          <div className="xl:col-span-1">
            <EmployeePieChart />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-xl font-bold text-primary">Warehouse</h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <WarehouseTable />
          </div>
          <div className="xl:col-span-1">
            <CategoryPieChart />
          </div>
        </div>
      </div>
    </div>
  );
}
