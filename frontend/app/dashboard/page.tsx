"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserFromToken, UserRole } from "@/lib/auth";

import AdminDashboard from "@/components/dashboard/AdminDashboard";
import HrDashboard from "@/components/dashboard/HrDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import ManagerDashboard from "@/components/dashboard/ManagerDashboard";
import FinanceDashboard from "@/components/dashboard/FinanceDashboard";

export default function DashboardPage() {
    const router = useRouter();
    const [role, setRole] = useState<UserRole | null>(null);

    useEffect(() => {
        const user = getUserFromToken();
        console.log(user)

        if (!user) {
            router.replace("/login");
            return;
        }

        if (user.role !== role) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setRole(user.role);
        }
    }, [router, role]);

    if (!role) {
        return <p>Loading...</p>;
    }

    switch (role) {
        case "ADMIN":
            return <AdminDashboard />;

        case "HR":
            return <HrDashboard />;

        case "EMPLOYEE":
            return <EmployeeDashboard />;

        case "FINANCE":
            return <FinanceDashboard />;

        case "MANAGER":
            return <ManagerDashboard />;


        default:
            return <p>Unauthorized</p>;
    }
}
