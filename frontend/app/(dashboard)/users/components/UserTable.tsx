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
import { type UserListItem } from "../page";
import Image from "next/image";

const USERS_PER_PAGE = 8;

type UserTableProps = {
  users: UserListItem[];
};

export default function UserTable({ users }: UserTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);

  const startIndex = (page - 1) * USERS_PER_PAGE;
  const currentData = users.slice(startIndex, startIndex + USERS_PER_PAGE);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <Table className="min-w-275">
          <TableHeader>
            <TableRow className="bg-muted">
              <TableHead>Full Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Visa Expiry Date</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="border-separate border-spacing-y-3 text-foreground">
            {currentData.map((u,index) => (
              <TableRow  key={index}
              className={`border-none rounded-xl ${
                index % 2 === 1 ? "bg-sky-100/60" : ""
              }`}>
                
                <TableCell className="font-medium rounded-l-xl">
                  <div className="flex items-center gap-1 min-w-25">
                  <Image
                    src="/image/profilePic.png"
                    alt={`${u.name} profile picture`}
                    width={32}
                    height={32}
                    className=" rounded-full"
                  />
                  <Link
                    href={`/users/${u.id}`}
                    className="text-primary hover:underline whitespace-nowrap"
                  >
                    {u.name}
                  </Link>

                  </div>
                </TableCell>

                <TableCell>{u.department}</TableCell>
                <TableCell>{u.branch}</TableCell>
                <TableCell>{u.startDate}</TableCell>
                <TableCell>{u.visaexpiryDate}</TableCell>
                <TableCell>{u.salary}</TableCell>

                <TableCell className="flex flex-col gap-2 sm:flex-row sm:gap-3 text-destructive">
                  <button>Edit</button>
                  <button>Delete</button>
                  <button>Report</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
