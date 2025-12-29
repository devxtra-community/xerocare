import StatCard from "@/components/StatCard";
import ProductsTable from "@/components/productTable";
import HrTable from "@/components/HrTable";
import SalesChart from "@/components/SalesChart";
import EmployeePieChart from "@/components/employeesPiechart";

import CategoryPieChart from "@/components/CategoryPieChart";

export default function Dashboard() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* SALES */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-blue-900">
          Sales
        </h3>

        {/* STAT CARDS – 4 IN A ROW (COMPACT) */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          <StatCard
            title="Total Earnings"
            value="100.000"
            subtitle="1 month"
          />
          <StatCard
            title="Products Sold"
            value="3400"
            subtitle="1 month"
          />
          <StatCard
            title="Best Model"
            value="Electronics"
            subtitle="1 month"
          />
          <StatCard
            title="Top Product"
            value="iPhone 15 Pro"
            subtitle="1 month"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-blue-900">
              Products
            </h3>
            <ProductsTable />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm sm:text-base font-bold text-blue-900">
              Sales Overview
            </h3>
            <SalesChart />
          </div>
        </div>
      </div>

      {/* HUMAN RESOURCES */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-blue-900">
          Human Resources
        </h3>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <HrTable />
          </div>
          <div className="xl:col-span-1">
            <EmployeePieChart />
          </div>
        </div>
      </div>

      {/* WAREHOUSE */}
      <div className="space-y-3">
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-blue-900">
          Warehouse
        </h3>

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