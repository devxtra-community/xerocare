"use client"

import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";

import Link from "next/link";
import Pagination from "./Pagination";

const users = [
    {
        id: 1,
        name: "Seving Aslanova",
        department: "Marketing",
        branch: "Kochi",
        startDate: "19.02.2023",
        expiryDate: "19.02.2023",
        salary: "1200 AZN"
    }
]

export default function UserTable() {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead className="text-foreground">Full Name</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Branch Name</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead>Salary</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.id} className="hover:bg-muted/50">
                                <TableCell className="font-medium">
                                    <Link href={`/dasboard/users/${u.id}`}
                                        className="font-medium text-primary hover:underline">
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
            <Pagination />
        </div>
    )
}