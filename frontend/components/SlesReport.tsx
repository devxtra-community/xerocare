"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SalesChart from "@/components/salesChart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, ArrowUpDown } from "lucide-react";

type BillingType = "FOR SALE" | "FOR RENT" | "FOR LEASE" | "ALL";

type Product = {
  id: string;
  name: string;
  category: string;
  productCode: string;
  quantity: number;
  price: string;
  date: string;
  billingType: BillingType;
};

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Macbook Pro",
    category: "Electronics",
    productCode: "ELEC-1001",
    quantity: 2,
    price: "2999 AZN",
    date: "20.09.2024",
    billingType: "FOR SALE",
  },
  {
    id: "2",
    name: "Macbook Air",
    category: "Electronics",
    productCode: "ELEC-1002",
    quantity: 4,
    price: "1499 AZN",
    date: "19.09.2024",
    billingType: "FOR RENT",
  },
  {
    id: "3",
    name: "Iphone 15 Pro",
    category: "Electronics",
    productCode: "ELEC-1003",
    quantity: 5,
    price: "3999 AZN",
    date: "18.09.2024",
    billingType: "FOR SALE",
  },
  {
    id: "4",
    name: "Iphone 15 Pro Max",
    category: "Electronics",
    productCode: "ELEC-1004",
    quantity: 10,
    price: "4499 AZN",
    date: "18.09.2024",
    billingType: "FOR LEASE",
  },
  {
    id: "5",
    name: "Iphone 15",
    category: "Electronics",
    productCode: "ELEC-1005",
    quantity: 12,
    price: "1999 AZN",
    date: "17.09.2024",
    billingType: "FOR SALE",
  },
];

export default function SalesPage() {
  const [billingType, setBillingType] = useState<BillingType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = mockProducts.filter((product) => {
    const matchesType =
      billingType === "ALL" || product.billingType === billingType;

    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.productCode.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-blue-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-primary">
                Sales Report
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage and track your sales transactions
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm font-medium text-primary whitespace-nowrap">
                BILL TYPE
              </span>
              <Select
                value={billingType}
                onValueChange={(v) => setBillingType(v as BillingType)}
              >
                <SelectTrigger className="w-full sm:w-[180px] bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["ALL", "FOR SALE", "FOR RENT", "FOR LEASE"].map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <SalesChart />

        
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
            <h2 className="text-base sm:text-lg font-semibold text-primary">
              Products Sold
            </h2>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-full sm:w-[200px] border-slate-200 h-9"
                />
              </div>

              <div className="flex gap-2 sm:gap-3">
                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial h-9">
                  <ArrowUpDown className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Sort</span>
                </Button>

                <Button variant="outline" size="sm" className="flex-1 sm:flex-initial h-9">
                  <Filter className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Filter</span>
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 -mx-3 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-white border-b border-slate-200">
                  {["PRODUCT","CATEGORY","CODE","QTY","PRICE","DATE","BILL TYPE"].map(h => (
                    <TableHead
                      key={h}
                      className="text-primary font-semibold text-xs sm:text-sm whitespace-nowrap px-2 sm:px-4"
                    >
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredProducts.length ? (
                  filteredProducts.map((product, index) => (
                    <TableRow
                      key={product.id}
                      className={`
                        ${index % 2 === 1 ? "bg-[#F4F9FF]" : "bg-white"}
                        hover:bg-[#EAF3FF] transition
                      `}
                    >
                      <TableCell className="font-medium text-slate-800 text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap">
                        {product.name}
                      </TableCell>
                      <TableCell className="text-slate-700 text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap">
                        {product.category}
                      </TableCell>
                      <TableCell className="text-slate-700 text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap">
                        {product.productCode}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm px-2 sm:px-4">{product.quantity}</TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap">
                        {product.price}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm px-2 sm:px-4 whitespace-nowrap">{product.date}</TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <span
                          className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                            product.billingType === "FOR SALE"
                              ? "bg-blue-50 text-blue-700"
                              : product.billingType === "FOR RENT"
                              ? "bg-green-50 text-green-700"
                              : "bg-purple-50 text-purple-700"
                          }`}
                        >
                          {product.billingType}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 sm:py-8 text-slate-500 text-xs sm:text-sm">
                      No products found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}