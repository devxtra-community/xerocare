import StatCard from "@/components/StatCard";
import ProductsTable from "@/components/productTable";
import HrTable from "@/components/HrTable";
import SalesChart from "@/components/SalesChart";
import EmployeePieChart from "@/components/employeesPiechart";

import CategoryPieChart from "@/components/CategoryPieChart";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 space-y-6">
   
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-blue-900">
          Dashboard
        </h1>
        <span className="text-sm sm:text-base text-gray-600">
          Welcome back, <span className="font-semibold">Riyas</span>
        </span>
      </div>


      <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 space-y-5">
        <h2 className="text-lg sm:text-xl font-semibold text-blue-900">
          Sales Overview
        </h2>

      
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Total Earnings" value="₹100,000" subtitle="Last 30 days" />
          <StatCard title="Products Sold" value="3,400" subtitle="Last 30 days" />
          <StatCard title="Top Category" value="Electronics" subtitle="This month" />
          <StatCard title="Top Product" value="iPhone 15 Pro" subtitle="This month" />
        </div>

       
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-base font-semibold text-blue-900 mb-3">
              Products
            </h3>
            <ProductsTable />
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-base font-semibold text-blue-900 mb-3">
              Sales Trend
            </h3>
            <SalesChart />
          </div>
        </div>
      </section>

   
      <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 space-y-5">
        <h2 className="text-lg sm:text-xl font-semibold text-blue-900">
          Human Resources
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-gray-50 rounded-xl p-4">
            <HrTable />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
            <EmployeePieChart />
          </div>
        </div>
      </section>

      
      <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 space-y-5">
        <h2 className="text-lg sm:text-xl font-semibold text-blue-900">
          Warehouse
        </h2>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 bg-gray-50 rounded-xl p-4">
          
          </div>

          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-center">
            <CategoryPieChart />
          </div>
        </div>
      </section>
    </div>
  );
}
