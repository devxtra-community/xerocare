import StatCard from "@/components/StatCard";
import SalesSummaryTable from "@/components/AdminComponents/saleComponents/SalesSummaryTable";
import SalesChart from "@/components/AdminComponents/dashboardComponents/SalesChart";

import MonthlySalesBarChart from "@/components/AdminComponents/saleComponents/monthlysalesChart";
import MostSoldProductChart from "@/components/AdminComponents/saleComponents/MostSoldProductChart";

export default function AdminSalesPage() {
  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8 sm:space-y-10">
      {/* SALES */}
      <div className="space-y-4 sm:space-y-6">
        <h3 className="text-xl sm:text-2xl font-bold text-blue-900">
          Sales
        </h3>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 md:gap-4">
          <StatCard title="Total Revenue" value="₹100,000" subtitle="Last 30 days" />
          <StatCard title="Total Orders" value="420" subtitle="Last 30 days" />
          <StatCard title="Products Sold" value="3,400" subtitle="Last 30 days" />
          <StatCard title="Top Product" value="iPhone 15 Pro" subtitle="This month" />
        </div>

        {/* TABLE + TREND */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 items-stretch">
          <div className="xl:col-span-2 flex flex-col space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-blue-900">
              Sales Summary
            </h3>
            <div className="flex-1">
              <SalesSummaryTable />
            </div>
          </div>

          <div className="flex flex-col space-y-4">
            <h3 className="text-lg sm:text-xl font-bold text-blue-900">
              Sales Trend
            </h3>
            <div className="flex-1 bg-white rounded-xl p-3">
              <SalesChart />
            </div>
          </div>
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-blue-900">
              Sales per Month
            </h4>
            <div className="bg-white rounded-xl p-3">
              <MonthlySalesBarChart />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg sm:text-xl font-bold text-blue-900">
              Sold Products by Quantity
            </h4>
            <div className="bg-white rounded-xl p-3">
              <MostSoldProductChart />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


