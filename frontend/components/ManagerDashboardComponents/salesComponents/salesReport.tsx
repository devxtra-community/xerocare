"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import StatCard from "@/components/StatCard";



type ProductSale = {
  id: string;
  productName: string;
  model: string;
  category: string;
  qtySold: number;
  revenue: number;
  paymentMode: "Cash" | "UPI" | "Card";
  date: string;
};



const initialSales: ProductSale[] = [
  {
    id: "1",
    productName: "HP LaserJet Pro",
    model: "HP-LJ-982345",
    category: "Printer",
    qtySold: 3,
    revenue: 90000,
    paymentMode: "UPI",
    date: "2024-09-18",
  },
  {
    id: "2",
    productName: "Canon ImageCLASS",
    model: "CN-IMG-774521",
    category: "Printer",
    qtySold: 2,
    revenue: 52000,
    paymentMode: "Card",
    date: "2024-09-18",
  },
  {
    id: "3",
    productName: "Epson EcoTank",
    model: "EP-ET-556812",
    category: "Printer",
    qtySold: 1,
    revenue: 28000,
    paymentMode: "Cash",
    date: "2024-09-18",
  },
];



export default function BranchProductSales() {
  const [sales] = useState(initialSales);
  const [search, setSearch] = useState("");

  const filteredSales = sales.filter((s) =>
    `${s.productName} ${s.model} ${s.category}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  
  const totalRevenue = sales.reduce((sum, s) => sum + s.revenue, 0);
  const totalProductsSold = sales.reduce((sum, s) => sum + s.qtySold, 0);
  const topProduct =
    sales.sort((a, b) => b.qtySold - a.qtySold)[0]?.productName ?? "-";
  const avgBill = totalRevenue / sales.length || 0;

  return (
    <div className="bg-blue-100 min-h-screen p-3 sm:p-4 md:p-6 space-y-8">


      <h3 className="text-xl sm:text-2xl font-bold text-blue-900">
        Product Sales
      </h3>


      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard
          title="Today Revenue"
          value={`₹${totalRevenue.toLocaleString()}`}
          subtitle="Branch total"
        />
        <StatCard
          title="Products Sold"
          value={totalProductsSold.toString()}
          subtitle="Total quantity"
        />
        <StatCard
          title="Top Product"
          value={topProduct}
          subtitle="By quantity"
        />
        <StatCard
          title="Avg Bill Value"
          value={`₹${avgBill.toFixed(0)}`}
          subtitle="Per sale"
        />
      </div>

     
      <div className="flex items-center justify-between">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search product"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

 
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "PRODUCT",
                "MODEL",
                "CATEGORY",
                "QTY SOLD",
                "REVENUE",
                "PAYMENT",
                "DATE",
              ].map((h) => (
                <TableHead
                  key={h}
                  className="text-[11px] font-semibold text-blue-900 px-4"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredSales.map((s, i) => (
              <TableRow key={s.id} className={i % 2 ? "bg-sky-100/60" : ""}>
                <TableCell className="px-4 font-medium">
                  {s.productName}
                </TableCell>
                <TableCell className="px-4">{s.model}</TableCell>
                <TableCell className="px-4">{s.category}</TableCell>
                <TableCell className="px-4">{s.qtySold}</TableCell>
                <TableCell className="px-4 font-semibold text-primary">
                  ₹{s.revenue.toLocaleString()}
                </TableCell>
                <TableCell className="px-4">
                  <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                    {s.paymentMode}
                  </span>
                </TableCell>
                <TableCell className="px-4">{s.date}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
