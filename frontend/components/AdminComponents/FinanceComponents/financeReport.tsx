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

type Finance = {
  id: string;
  Month: string;
  Income: number;
  expense: number;
  source: "Sale" | "Lease" | "Rent";
  totalIncome: number;
  profitStatus: "profit" | "loss";
};

const initialFinance: Finance[] = [
  {
    id: "1",
    Month: "January 2024",
    Income: 450000,
    expense: 320000,
    source: "Sale",
    totalIncome: 130000,
    profitStatus: "profit",
  },
  {
    id: "2",
    Month: "February 2024",
    Income: 420000,
    expense: 300000,
    source: "Rent",
    totalIncome: 120000,
    profitStatus: "profit",
  },
  {
    id: "3",
    Month: "March 2024",
    Income: 500000,
    expense: 350000,
    source: "Lease",
    totalIncome: 150000,
    profitStatus: "profit",
  },
  {
    id: "4",
    Month: "April 2024",
    Income: 470000,
    expense: 330000,
    source: "Sale",
    totalIncome: 140000,
    profitStatus: "profit",
  },
  {
    id: "5",
    Month: "May 2024",
    Income: 520000,
    expense: 380000,
    source: "Rent",
    totalIncome: 140000,
    profitStatus: "profit",
  },
];

export default function FinanceReport() {
  const [finance] = useState<Finance[]>(initialFinance);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<
    "All" | "Sale" | "Lease" | "Rent"
  >("All");

  // 🔍 Search + Source filter
  const filteredFinance = finance.filter((f) => {
    const matchesSearch = `${f.Month} ${f.source}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesSource =
      sourceFilter === "All" || f.source === sourceFilter;

    return matchesSearch && matchesSource;
  });

  // 📊 Stats
  const totalIncome = finance.reduce((s, f) => s + f.Income, 0);
  const totalExpense = finance.reduce((s, f) => s + f.expense, 0);
  const netProfit = totalIncome - totalExpense;
  const profitMonths = finance.filter(
    (f) => f.profitStatus === "profit"
  ).length;

  return (
    <div className="bg-blue-100 min-h-screen p-4 space-y-6">
      {/* Header */}
      <h3 className="text-lg font-bold text-blue-900">
        Financial Report
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Total Income"
          value={`₹ ${totalIncome.toLocaleString()}`}
          subtitle="All months"
        />
        <StatCard
          title="Total Expense"
          value={`₹ ${totalExpense.toLocaleString()}`}
          subtitle="All months"
        />
        <StatCard
          title="Net Profit"
          value={`₹ ${netProfit.toLocaleString()}`}
          subtitle="Income - Expense"
        />
        <StatCard
          title="Profit Months"
          value={profitMonths.toString()}
          subtitle="Positive months"
        />
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 items-center">
        <div className="relative w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by month or source"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) =>
            setSourceFilter(e.target.value as any)
          }
          className="h-9 rounded-md border border-input bg-white px-3 text-sm"
        >
          <option value="All">All Sources</option>
          <option value="Sale">Sale</option>
          <option value="Lease">Lease</option>
          <option value="Rent">Rent</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "MONTH",
                "SOURCE",
                "INCOME",
                "EXPENSE",
                "PROFIT",
                "STATUS",
              ].map((h) => (
                <TableHead
                  key={h}
                  className="text-xs font-semibold text-blue-900 uppercase px-4"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredFinance.map((f, i) => (
              <TableRow
                key={f.id}
                className={i % 2 ? "bg-sky-100/60" : ""}
              >
                <TableCell className="px-4 font-medium">
                  {f.Month}
                </TableCell>
                <TableCell className="px-4">
                  {f.source}
                </TableCell>
                <TableCell className="px-4">
                  ₹ {f.Income.toLocaleString()}
                </TableCell>
                <TableCell className="px-4">
                  ₹ {f.expense.toLocaleString()}
                </TableCell>
                <TableCell className="px-4 font-medium text-primary">
                  ₹ {f.totalIncome.toLocaleString()}
                </TableCell>
                <TableCell className="px-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      f.profitStatus === "profit"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {f.profitStatus}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
