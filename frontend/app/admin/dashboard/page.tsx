import { StatCard } from "@/components/statcard"
import ProductsTable from "@/components/productTable"
import HrTable from "@/components/hrTable"
import SalesChart from "@/components/salesChart"
import EmployeePieChart from "@/components/employeesPiechart"
import WarehouseTable from "@/components/wearhouseTable"
import CategoryPieChart from "@/components/categoryPiechart"

export default function Dashboard() {
  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 space-y-6">
      <h3 className="text-2xl sm:text-3xl font-bold text-blue-900">Welcome, Riyas!</h3>

      <div className="flex flex-col space-y-4">
        <h3 className="text-xl font-bold text-blue-900">Sales</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Earnings" value="100.000 AZN" subtitle="1 month indicator" />
          <StatCard title="Total Number Of Products Sold" value="3400" subtitle="1 month indicator" />
          <StatCard title="Best Selling Model" value="Electronics" subtitle="1 month indicator" />
          <StatCard title="Best Selling Product" value="Iphone 15 Pro" subtitle="1 month indicator" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-blue-900">Products</h3>
            <ProductsTable />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-blue-900">Sales Overview</h3>
            <SalesChart />
          </div>
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        <h3 className="text-xl font-bold text-blue-900">Human Resources</h3>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <HrTable />
          <EmployeePieChart />
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        <h3 className="text-xl font-bold text-blue-900">Warehouse</h3>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <WarehouseTable />
          <CategoryPieChart />
        </div>
      </div>
    </div>
  )
}