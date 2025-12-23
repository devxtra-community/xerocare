"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Filter, ArrowUpDown, X, Trash2 } from "lucide-react";

type Branch = {
  id: string;
  branchName: string;
  address: string;
  location: string;
  startedDate: string;
  status: "active" | "inactive";
};

const ITEMS_PER_PAGE = 10;

/* ✅ MANUALLY ADDED 11 RECORDS */
const initialBranches: Branch[] = [
  {
    id: "1",
    branchName: "CityWave Store",
    address: "MG Road, Ernakulam",
    location: "Ernakulam",
    startedDate: "20.11.2023",
    status: "active",
  },
  {
    id: "2",
    branchName: "UrbanHub Outlet",
    address: "Vyttila Junction",
    location: "Kochi",
    startedDate: "10.02.2023",
    status: "active",
  },
  {
    id: "3",
    branchName: "PrimePoint Store",
    address: "Pattom",
    location: "Thiruvananthapuram",
    startedDate: "18.05.2024",
    status: "inactive",
  },
  {
    id: "4",
    branchName: "North Depot",
    address: "Round North",
    location: "Thrissur",
    startedDate: "12.01.2022",
    status: "active",
  },
  {
    id: "5",
    branchName: "South Warehouse",
    address: "Kazhakkoottam",
    location: "Trivandrum",
    startedDate: "09.09.2021",
    status: "inactive",
  },
  {
    id: "6",
    branchName: "Metro Store",
    address: "SM Street",
    location: "Kozhikode",
    startedDate: "22.06.2023",
    status: "active",
  },
  {
    id: "7",
    branchName: "HillView Outlet",
    address: "Kalpetta Road",
    location: "Wayanad",
    startedDate: "15.03.2022",
    status: "active",
  },
  {
    id: "8",
    branchName: "LakeSide Store",
    address: "Vembanad",
    location: "Alappuzha",
    startedDate: "01.08.2020",
    status: "inactive",
  },
  {
    id: "9",
    branchName: "Harbor Point",
    address: "Beach Road",
    location: "Kollam",
    startedDate: "11.11.2021",
    status: "active",
  },
  {
    id: "10",
    branchName: "Valley Mart",
    address: "Main Junction",
    location: "Idukki",
    startedDate: "05.05.2022",
    status: "inactive",
  },
  {
    id: "11",
    branchName: "GreenField Store",
    address: "NH Bypass",
    location: "Palakkad",
    startedDate: "30.10.2023",
    status: "active",
  },
];

export default function BranchReport() {
  const [branches, setBranches] = useState(initialBranches);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBranch, setDeleteBranch] = useState<Branch | null>(null);

  /* FILTER */
  const filteredBranches = branches.filter((b) =>
    `${b.branchName} ${b.address} ${b.location}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  /* PAGINATION */
  const totalPages = Math.ceil(filteredBranches.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentData = filteredBranches.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const confirmDelete = () => {
    if (!deleteBranch) return;
    setBranches((prev) => prev.filter((b) => b.id !== deleteBranch.id));
    setDeleteOpen(false);
    setDeleteBranch(null);
  };

  return (
    <div className="min-h-screen bg-blue-100 p-4">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-semibold text-primary">Branches</h1>
            <p className="text-sm text-slate-500">
              Manage and track branch information
            </p>
          </div>
          <Button className="bg-blue-900 text-white">Add Branch</Button>
        </div>

        {/* SEARCH */}
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search branch"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 w-[240px]"
            />
          </div>
          <Button variant="outline">
            <ArrowUpDown className="h-4 w-4 mr-1" /> Sort
          </Button>
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-1" /> Filter
          </Button>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BRANCH NAME</TableHead>
                <TableHead>ADDRESS</TableHead>
                <TableHead>LOCATION</TableHead>
                <TableHead>STARTED DATE</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead>ACTION</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {currentData.map((b, i) => (
                <TableRow key={b.id} className={i % 2 ? "bg-blue-50" : ""}>
                  <TableCell>{b.branchName}</TableCell>
                  <TableCell>{b.address}</TableCell>
                  <TableCell>{b.location}</TableCell>
                  <TableCell>{b.startedDate}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        b.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {b.status}
                    </span>
                  </TableCell>
                  <TableCell className="space-x-3 text-xs">
                    <button className="text-blue-600 hover:underline">
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => {
                        setDeleteBranch(b);
                        setDeleteOpen(true);
                      }}
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* PAGINATION */}
          <div className="mt-3 flex items-center justify-center gap-1 text-xs pb-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border px-2 py-0.5 disabled:opacity-40 hover:bg-gray-50"
            >
              &lt;
            </button>

            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-2 py-0.5 rounded-md ${
                  currentPage === i + 1
                    ? "bg-blue-900 text-white"
                    : "border hover:bg-gray-50"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className="rounded-md border px-2 py-0.5 disabled:opacity-40 hover:bg-gray-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* DELETE MODAL */}
      {deleteOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 text-center relative">
            <button
              className="absolute top-4 right-4"
              onClick={() => setDeleteOpen(false)}
            >
              <X />
            </button>
            <Trash2 className="mx-auto text-red-600 mb-3" />
            <h3 className="text-lg font-semibold">Delete Branch</h3>
            <p className="text-sm text-slate-500 mt-1">
              Are you sure you want to delete{" "}
              <b>{deleteBranch?.branchName}</b>?
            </p>
            <div className="flex justify-center gap-4 mt-6">
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-600 text-white" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

