import {StatCard}  from "@/components/statcard"
import ProductsTable from "@/components/productTable"


export default function Dashboard() {
  return (
    <div className="p-6">
      <h2 className="mb-4 text-3xl font-serif">Admin Dashboard</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Earnings"
          value="₹100,000"
          subtitle="1 month indicator"
        />

        <StatCard
          title="Total Number Of Products Sold"
          value="3400"
          subtitle="1 month indicator"
        />

        <StatCard
          title="Best Selling Model"
          value="Electronics"
          subtitle="1 month indicator"
        />

        <StatCard
          title="Best Selling Product"
          value="iPhone 15 Pro"
          subtitle="1 month indicator"
        />
      </div>
      <div className="flex" >

      <div className="w-142.5 h-75 mt-7.5">
         <ProductsTable />
      </div>
      
       
      </div>
      <div><h1 className="pt-[20px] text-primary">Human Resource</h1></div>
     <div className="w-[700px] pt-[30px]">
        <HrTable/>
      </div>
    </div>
  )
}
