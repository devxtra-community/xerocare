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
import ConfirmDialog from "@/components/AlertDialog";

const USERS_PER_PAGE = 8;

type UserTableProps = {
  users: UserListItem[];
};

export default function UserTable({ users }: UserTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);

  const startIndex = (page - 1) * USERS_PER_PAGE;
  const currentData = users.slice(startIndex, startIndex + USERS_PER_PAGE);

  const handleUserEdit = (userId: number) => {
    console.log("edit user", userId);
  };

  const handleUserDelete = async (userId: number) => {
    console.log("delete user", userId);
  };

  return (
    <div>
      <div className="rounded-2xl shadow-sm border  pl-2 bg-card">
        <Table className="min-w-150">
          <TableHeader>
            <TableRow>
              <TableHead className="text-primary">Full Name</TableHead>
              <TableHead className="text-primary">Department</TableHead>
              <TableHead className="text-primary">Branch</TableHead>
              <TableHead className="text-primary">Start Date</TableHead>
              <TableHead className="text-primary">Visa Expiry</TableHead>
              <TableHead className="text-primary">Salary</TableHead>
              <TableHead className="text-primary">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="text-foreground">
            {currentData.map((u, index) => (
              <TableRow
                key={index}
                className={`border-none rounded-xl ${
                  index % 2 === 1 ? "bg-sky-100/60" : ""
                }`}
              >
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
                      className="hover:underline whitespace-normal"
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
                  <button
                    className="hover:underline text-primary"
                    onClick={() => handleUserEdit(u.id)}
                  >
                    Edit
                  </button>
                  <ConfirmDialog
                    title="Delete employee?"
                    description={`This will permanently remove ${u.name} from the system.`}
                    confirmText="Delete"
                    onConfirm={() => handleUserDelete(u.id)}
                    trigger={
                      <button className="hover:underline text-accent">
                        Delete
                      </button>
                    }
                  />
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
