"use client";
import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit2, MoreVertical } from "lucide-react";

const inventoryData = [
  {
    id: "INV-001",
    productName: "HP LaserJet Pro M404n",
    model: "M404n",
    activeStock: 45,
    damagedStock: 2,
    vendor: "HP India",
    warehouse: "Main Warehouse",
  },
  {
    id: "INV-002",
    productName: "Canon imageCLASS LBP6230dn",
    model: "LBP6230dn",
    activeStock: 30,
    damagedStock: 5,
    vendor: "Canon Sales",
    warehouse: "North Storage",
  },
  {
    id: "INV-003",
    productName: "Brother HL-L2350DW",
    model: "HL-L2350DW",
    activeStock: 12,
    damagedStock: 0,
    vendor: "Brother Corp",
    warehouse: "Main Warehouse",
  },
  {
    id: "INV-004",
    productName: "Epson EcoTank L3210",
    model: "L3210",
    activeStock: 80,
    damagedStock: 12,
    vendor: "Epson Direct",
    warehouse: "East Wing",
  },
  {
    id: "INV-005",
    productName: "Samsung Xpress M2020W",
    model: "M2020W",
    activeStock: 5,
    damagedStock: 8,
    vendor: "Global Tech",
    warehouse: "North Storage",
  },
];

export default function InventoryProductsTable() {
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(inventoryData.length / ITEMS_PER_PAGE);
  const startIndex = (page - 1) * ITEMS_PER_PAGE;
  const currentData = inventoryData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-blue-900 uppercase px-6">Product Name</TableHead>
              <TableHead className="text-xs font-semibold text-blue-900 uppercase px-6">Model</TableHead>
              <TableHead className="text-xs font-semibold text-blue-900 uppercase px-6 text-center">Active Stock</TableHead>
              <TableHead className="text-xs font-semibold text-blue-900 uppercase px-6 text-center">Damaged</TableHead>
              <TableHead className="text-xs font-semibold text-blue-900 uppercase px-6">Vendor</TableHead>
              <TableHead className="text-xs font-semibold text-blue-900 uppercase px-6">Warehouse</TableHead>
              <TableHead className="text-xs font-semibold text-blue-900 uppercase px-6 text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((item, index) => (
              <TableRow key={item.id} className={`hover:bg-gray-50/30 transition-colors ${index % 2 ? "bg-sky-100/60" : ""}`}>
                <TableCell className="px-6 py-4 font-medium text-gray-900">{item.productName}</TableCell>
                <TableCell className="px-6 py-4 text-gray-600">{item.model}</TableCell>
                <TableCell className="px-6 py-4 text-center font-bold text-gray-900">{item.activeStock}</TableCell>
                <TableCell className="px-6 py-4 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    item.damagedStock > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}>
                    {item.damagedStock}
                  </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-gray-600">{item.vendor}</TableCell>
                <TableCell className="px-6 py-4 text-gray-600">
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                     {item.warehouse}
                   </div>
                </TableCell>
                <TableCell className="px-6 py-4 text-right pr-6">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-primary">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 border-t border-gray-50 flex items-center justify-between bg-white">
        <p className="text-xs text-gray-500">Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, inventoryData.length)} of {inventoryData.length} products</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 text-[11px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50"
          >
            Previous
          </Button>
          <div className="flex items-center gap-1 mx-2">
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-7 h-7 rounded-lg text-[11px] flex items-center justify-center transition-colors ${
                  page === i + 1 ? "bg-primary text-white" : "hover:bg-blue-50 text-blue-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 text-[11px] rounded-lg border-blue-100 text-blue-700 hover:bg-blue-50"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
