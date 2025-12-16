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
  { name: "Iphone 15 Pro Max", qty: 10, price: "4499 AZN", date: "18.09.2024" },
  { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
  { name: "Macbook Pro", qty: 2, price: "2999 AZN", date: "20.09.2024" },
  { name: "Macbook Air", qty: 4, price: "1499 AZN", date: "19.09.2024" },
  { name: "Iphone 15 Pro", qty: 15, price: "3999 AZN", date: "18.09.2024" },
  { name: "Iphone 15 Pro Max", qty: 10, price: "4499 AZN", date: "18.09.2024" },
  { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
  { name: "Iphone 15", qty: 12, price: "1999 AZN", date: "17.09.2024" },
]

const ITEMS_PER_PAGE = 5

export default function ProductsTable() {
  const [page, setPage] = useState(1)

  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE)

  const startIndex = (page - 1) * ITEMS_PER_PAGE
  const currentData = data.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-none">
            <TableHead className="text-primary font-semibold">
              PRODUCT NAME
            </TableHead>
            <TableHead className="text-primary font-semibold">
              QUANTITY
            </TableHead>
            <TableHead className="text-primary font-semibold">
              PRICE
            </TableHead>
            <TableHead className="text-primary font-semibold">
              DATE
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody className="border-separate border-spacing-y-3">
          {currentData.map((item, index) => (
            <TableRow
              key={index}
              className={`border-none rounded-xl ${
                index % 2 === 1 ? "bg-sky-100/60" : ""
              }`}
            >
              <TableCell className="font-medium rounded-l-xl">
                {item.name}
              </TableCell>
              <TableCell>{item.qty}</TableCell>
              <TableCell>{item.price}</TableCell>
              <TableCell className="rounded-r-xl">
                {item.date}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="mt-6 flex items-center gap-4 text-sm">
        <button
          onClick={() => setPage(p => p - 1)}
          disabled={page === 1}
          className="rounded-md border px-4 py-2 disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-slate-600">
          Page {page} of {totalPages}
        </span>

        <button
          onClick={() => setPage(p => p + 1)}
          disabled={page === totalPages}
          className="rounded-md border px-4 py-2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  )
}

