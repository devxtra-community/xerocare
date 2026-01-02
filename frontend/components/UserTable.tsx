"use client";

import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import Link from "next/link";
import { useState } from "react";
import Pagination from "./Pagination";
import ConfirmDialog from "./ConfirmDialog";

export type UserListItem = {
  id: string;
  name: string;
  department: string;
  branch: string;
  employmentType: "Full-time" | "Part-time" | "Contract";
  status: "Active" | "On Leave" | "Inactive";
  startDate: string;
  visaExpiryDate: string;
  salary: number;
};

const USERS_PER_PAGE = 3;

type UserTableProps = {
  users: UserListItem[];
};

export default function UserTable({ users }: UserTableProps) {
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);
  const startIndex = (page - 1) * USERS_PER_PAGE;
  const currentData = users.slice(startIndex, startIndex + USERS_PER_PAGE);

  return (
    <>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-white text-md ">
              <TableHead className="text-primary font-bold">Employee</TableHead>
              <TableHead className="text-primary font-bold">Department</TableHead>
              <TableHead className="text-primary font-bold">Branch</TableHead>
              <TableHead className="hidden md:table-cell text-primary font-bold">
                Employment Type
              </TableHead>
              <TableHead className="text-primary font-bold">Status</TableHead>
              <TableHead className="hidden lg:table-cell text-primary font-bold">
                Visa Expiry Date
              </TableHead>
              <TableHead className="text-primary font-bold">Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {currentData.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <Link
                    href={`/hr/employees/${u.id}`}
                    className=" hover:underline font-medium"
                  >
                    {u.name}
                  </Link>
                </TableCell>

                <TableCell>{u.department}</TableCell>
                <TableCell>{u.branch}</TableCell>

                <TableCell className="hidden md:table-cell">
                  {u.employmentType}
                </TableCell>

                <TableCell>
                  <StatusBadge status={u.status} />
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  {u.visaExpiryDate}
                </TableCell>

                <TableCell className="space-x-3">
                  <button className="text-primary hover:underline">
                    Edit
                  </button>
                  <button
                    className="text-accent hover:underline"
                    onClick={() => setDeleteId(u.id)}
                  >
                    Delete
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
      </div>


      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={() => setDeleteId(null)}
        title="Delete employee?"
        description="This action cannot be undone."
        confirmText="Delete"
        onConfirm={() => setDeleteId(null)}
      />
    </>
  );
}


function StatusBadge({ status }: { status: UserListItem["status"] }) {
  const styles = {
    Active: "bg-green-100 text-green-700",
    "On Leave": "bg-yellow-100 text-yellow-700",
    Inactive: "bg-gray-100 text-gray-700",
  };

  return (
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}
