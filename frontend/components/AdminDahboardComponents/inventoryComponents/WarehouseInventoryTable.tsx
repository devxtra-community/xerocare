"use client"
import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const warehouseData = [
  {
    id: 1,
    name: "Main Warehouse",
    totalProducts: 450,
    totalQty: 12500,
    lowStock: 12,
    outOfStock: 2,
    status: "Operational"
  },
  {
    id: 2,
    name: "North Wing Storage",
    totalProducts: 120,
    totalQty: 3400,
    lowStock: 5,
    outOfStock: 0,
    status: "Operational"
  },
  {
    id: 3,
    name: "Downtown Clinic",
    totalProducts: 85,
    totalQty: 1200,
    lowStock: 8,
    outOfStock: 3,
    status: "Critical"
  },
  {
    id: 4,
    name: "East Wing Storage",
    totalProducts: 60,
    totalQty: 800,
    lowStock: 2,
    outOfStock: 1,
    status: "Warning"
  },
]

export default function WarehouseInventoryTable() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(warehouseData.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = warehouseData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="rounded-2xl bg-white p-2 sm:p-3 shadow-sm w-full min-h-[260px] flex flex-col">
       <div className="flex-1 overflow-x-auto">
        <Table>
            <TableHeader>
            <TableRow className="border-b">
                <TableHead className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">WAREHOUSE</TableHead>
                <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">PRODUCTS</TableHead>
                <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">TOTAL QTY</TableHead>
                <TableHead className="text-center text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">STATUS</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {currentData.map((item, index) => (
                <TableRow key={item.id} className={`border-none ${index % 2 === 1 ? "bg-sky-100/60" : ""}`}>
                    <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-gray-900">{item.name}</TableCell>
                    <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-center">{item.totalProducts}</TableCell>
                    <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-center font-bold text-gray-700">{item.totalQty.toLocaleString()}</TableCell>
                    <TableCell className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            item.status === 'Critical' ? 'bg-red-100 text-red-700' : 
                            item.status === 'Warning' ? 'bg-orange-100 text-orange-700' : 
                            'bg-green-100 text-green-700'
                        }`}>
                            {item.status}
                        </span>
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </div>
       <div className="mt-2 sm:mt-3 flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs flex-shrink-0">
         {/* Pagination buttons matching others */}
        <button className="rounded-md border px-1.5 sm:px-2 py-0.5 disabled:opacity-40 hover:bg-gray-50 transition">&lt;</button>
        <span className="text-gray-500">Page 1 of 1</span>
        <button className="rounded-md border px-1.5 sm:px-2 py-0.5 disabled:opacity-40 hover:bg-gray-50 transition">&gt;</button>
      </div>
    </div>
  )
}
