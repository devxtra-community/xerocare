"use client"

import { useState } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"


const data = [
  {
    productName: "Iphone 14",
    productCode: "ELEC-1001",
    quantity: 15,
    supplyHistory: "20.11.2023",
  },
  {
    productName: "Samsung S24",
    productCode: "ELEC-1002",
    quantity: 20,
    supplyHistory: "20.11.2023",
  },
  {
    productName: "Black M Jacket",
    productCode: "CLOTH-BLK-M",
    quantity: 20,
    supplyHistory: "20.10.2023",
  },
  {
    productName: "Black L Jacket",
    productCode: "CLOTH-BLK-L",
    quantity: 20,
    supplyHistory: "30.10.2023",
  },
  {
    productName: "Armani Perfume",
    productCode: "COSM-ARM-201",
    quantity: 30,
    supplyHistory: "20.11.2023",
  },
  {
    productName: "Iphone 14",
    productCode: "ELEC-1001",
    quantity: 15,
    supplyHistory: "20.11.2023",
  },
  {
    productName: "Samsung S24",
    productCode: "ELEC-1002",
    quantity: 20,
    supplyHistory: "20.11.2023",
  },
  {
    productName: "Black M Jacket",
    productCode: "CLOTH-BLK-M",
    quantity: 20,
    supplyHistory: "20.10.2023",
  },
  {
    productName: "Black L Jacket",
    productCode: "CLOTH-BLK-L",
    quantity: 20,
    supplyHistory: "30.10.2023",
  },
  {
    productName: "Armani Perfume",
    productCode: "COSM-ARM-201",
    quantity: 30,
    supplyHistory: "20.11.2023",
  },
]

const ITEMS_PER_PAGE = 5

export default function WarehouseTable() {
  const [page, setPage] = useState(1)

  const data = [
    {productName: "Iphone 14", productCode: "ELEC-1001", quantity: 15, supplyHistory: "20.11.2023"},
    {productName: "Samsung S24", productCode: "ELEC-1002", quantity: 20, supplyHistory: "20.11.2023"},
    {productName: "Black M Jacket", productCode: "CLOTH-BLK-M", quantity: 20, supplyHistory: "20.10.2023"},
    {productName: "Black L Jacket", productCode: "CLOTH-BLK-L", quantity: 20, supplyHistory: "30.10.2023"},
    {productName: "Armani Perfume", productCode: "COSM-ARM-201", quantity: 30, supplyHistory: "20.11.2023"},
    {productName: "Iphone 14", productCode: "ELEC-1001", quantity: 15, supplyHistory: "20.11.2023"},
    {productName: "Samsung S24", productCode: "ELEC-1002", quantity: 20, supplyHistory: "20.11.2023"},
    {productName: "Black M Jacket", productCode: "CLOTH-BLK-M", quantity: 20, supplyHistory: "20.10.2023"},
    {productName: "Black L Jacket", productCode: "CLOTH-BLK-L", quantity: 20, supplyHistory: "30.10.2023"},
    {productName: "Armani Perfume", productCode: "COSM-ARM-201", quantity: 30, supplyHistory: "20.11.2023"},
  ]

  const ITEMS_PER_PAGE = 5
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)
  const startIndex = (page - 1) * ITEMS_PER_PAGE
  const currentData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm w-full h-[350px] flex flex-col">
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left text-sm font-semibold text-blue-900 py-3">PRODUCT NAME</th>
              <th className="text-left text-sm font-semibold text-blue-900 py-3">PRODUCT CODE</th>
              <th className="text-left text-sm font-semibold text-blue-900 py-3">QUANTITY</th>
              <th className="text-left text-sm font-semibold text-blue-900 py-3">SUPPLY HISTORY</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index) => (
              <tr key={index} className={index % 2 === 1 ? "bg-sky-100/60" : ""}>
                <td className="py-3 px-2 text-sm font-medium text-gray-900">{item.productName}</td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.productCode}</td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.quantity}</td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.supplyHistory}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-sm flex-shrink-0">
        <button
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
          className="rounded-md border px-3 py-1 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          &lt;
        </button>

        {Array.from({ length: Math.min(totalPages, 4) }, (_, i) => {
          const pageNum = i + 1
          if (pageNum === 4 && totalPages > 4) {
            return <span key="ellipsis" className="px-2">...</span>
          }
          return (
            <button
              key={pageNum}
              onClick={() => setPage(pageNum)}
              className={`px-3 py-1 rounded-md transition ${
                page === pageNum ? "bg-blue-900 text-white" : "border hover:bg-gray-50"
              }`}
            >
              {pageNum}
            </button>
          )
        })}

        {totalPages > 4 && (
          <button
            onClick={() => setPage(totalPages)}
            className={`px-3 py-1 rounded-md border transition ${
              page === totalPages ? "bg-blue-900 text-white" : "hover:bg-gray-50"
            }`}
          >
            {totalPages}
          </button>
        )}

        <button
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="rounded-md border px-3 py-1 disabled:opacity-40 hover:bg-gray-50 transition"
        >
          &gt;
        </button>
      </div>
    </div>
  )
}