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
  { name: "Macbook Pro", qty: 2, price: "2999 AZN", date: "20.09.2024" },
  { name: "Macbook Air", qty: 4, price: "1499 AZN", date: "19.09.2024" },
  { name: "Iphone 15 Pro", qty: 15, price: "3999 AZN", date: "18.09.2024" },
  { name: "Iphone 15 Pro Max", qty: 10, price: "4499 AZN", date: "19.09.2024" },
  { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
  { name: "Macbook Pro", qty: 2, price: "2999 AZN", date: "20.09.2024" },
  { name: "Macbook Air", qty: 4, price: "1499 AZN", date: "19.09.2024" },
  { name: "Iphone 15 Pro", qty: 15, price: "3999 AZN", date: "18.09.2024" },
  { name: "Iphone 15 Pro Max", qty: 10, price: "4499 AZN", date: "19.09.2024" },
  { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
  { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
]


export default function ProductsTable() {
  const [page, setPage] = useState(1)
  
  const data = [
    { name: "Macbook Pro", qty: 2, price: "2999 AZN", date: "20.09.2024" },
    { name: "Macbook Air", qty: 4, price: "1499 AZN", date: "19.09.2024" },
    { name: "Iphone 15 Pro", qty: 15, price: "3999 AZN", date: "18.09.2024" },
    { name: "Iphone 15 Pro Max", qty: 10, price: "4499 AZN", date: "19.09.2024" },
    { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
    { name: "Macbook Pro", qty: 2, price: "2999 AZN", date: "20.09.2024" },
    { name: "Macbook Air", qty: 4, price: "1499 AZN", date: "19.09.2024" },
    { name: "Iphone 15 Pro", qty: 15, price: "3999 AZN", date: "18.09.2024" },
    { name: "Iphone 15 Pro Max", qty: 10, price: "4499 AZN", date: "19.09.2024" },
    { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
    { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
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
              <th className="text-left text-sm font-semibold text-blue-900 py-3">QUANTITY</th>
              <th className="text-left text-sm font-semibold text-blue-900 py-3">PRICE</th>
              <th className="text-left text-sm font-semibold text-blue-900 py-3">DATE</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((item, index) => (
              <tr key={index} className={index % 2 === 1 ? "bg-sky-100/60" : ""}>
                <td className="py-3 px-2 text-sm font-medium text-gray-900">{item.name}</td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.qty}</td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.price}</td>
                <td className="py-3 px-2 text-sm text-gray-700">{item.date}</td>
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
