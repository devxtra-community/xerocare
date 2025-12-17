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

const USERS_PER_PAGE = 8; // 👈 show more rows (no scroll)

export default function UserTable({ users }: { users: any[] }) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);

  const startIndex = (page - 1) * USERS_PER_PAGE;
  const currentData = users.slice(
    startIndex,
    startIndex + USERS_PER_PAGE
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead>Full Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {currentData.map((u) => (
              <TableRow
                key={u.id}
                className="hover:bg-muted/50"
              >
                <TableCell className="font-medium">
                  <Link
                    href={`/users/${u.id}`}
                    className="text-primary hover:underline"
                  >
                    {u.name}
                  </Link>
                </TableCell>

                <TableCell>{u.department}</TableCell>
                <TableCell>{u.branch}</TableCell>
                <TableCell>{u.startDate}</TableCell>
                <TableCell>{u.expiryDate}</TableCell>
                <TableCell>{u.salary}</TableCell>

                <TableCell className="space-x-3 text-destructive">
                  <button>Edit</button>
                  <button>Delete</button>
                  <button>Report</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
