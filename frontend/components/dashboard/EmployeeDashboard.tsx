"use client";


import UserTable from "@/components/UserTable";

import AddEmployeeDialog from "../hr/AddEmployeeDialog";
import { employees } from "@/lib/hr";

export type UserListItem = {
    id: number;
    name: string;
    department: string;
    branch: string;
    startDate: string;
    expiryDate: string;
    salary: string;
};



export default function UsersPage() {


    return (
        <div className="space-y-6">
            {/*HEADER*/}

            <div className="flex items-center justify-between p-6">
                <h1 className="mb-4 text-3xl font-serif">Human Resources</h1>
                <AddEmployeeDialog />
            </div>

            <UserTable users={employees} />
        </div>
    )
}
