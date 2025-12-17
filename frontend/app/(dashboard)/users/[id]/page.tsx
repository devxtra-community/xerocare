import StatCard from "../components/StatCard";

const employee = {
    id: "11099877",
    name: "Aliana",
    department: "Finance Department",
    designation: "Accountant",
    outlet: "Ernakulam",
    joiningDate: "31/03/2025",
    employeeType: "Full Time",
    salary: "$2200",
    contractPeriod: "3 Years",
    manager: "Branch Manager",
    phone: "+91 9043847732",
    email: "aliana700@gmail.com",
    address: "Aluva, Muttom – Kerala",
};

export default function SingleEmployeePage() {
    return (
        <div className="grid grid-cols-12 gap-6 p-6">

            {/* LEFT PROFILE */}
            <div className="col-span-3 rounded-xl border border-border bg-card p-6">
                <img
                    src="/avatar.png"
                    className="mx-auto h-24 w-24 rounded-full"
                />

                <h2 className="mt-4 text-center text-base font-semibold">
                    {employee.name}
                </h2>

                <p className="text-center text-sm text-muted-foreground">
                    {employee.email}
                </p>

                <div className="mt-4 rounded-xl border border-border bg-card p-4">
                    <div className="mt-6 space-y-3 text-md">
                        <Info label="Employee ID" value={employee.id} />
                        <Info label="Department" value={employee.department} />
                        <Info label="Designation" value={employee.designation} />
                        <Info label="Outlet Allocation" value={employee.outlet} />
                        <Info label="Date of Joining" value={employee.joiningDate} />
                        <Info label="Employee Type" value={employee.employeeType} />
                        <Info label="Salary" value={employee.salary} />
                        <Info label="Contract Period" value={employee.contractPeriod} />
                        <Info label="Reporting Manager" value={employee.manager} />
                        <Info label="Mobile Number" value={employee.phone} />
                        <Info label="Address" value={employee.address} />
                    </div>
                </div>
            </div>

            {/* RIGHT DASHBOARD */}
            <div className="col-span-9 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    <StatCard title="Present Days" value="223" />
                    <StatCard title="Performance Trend" value="75%" />
                    <StatCard title="Tasks Completed" value="43%" />
                    <StatCard title="Leave Balance" value="22" />
                </div>

                <div className="h-64 rounded-xl border border-border bg-card" />
                <div className="h-64 rounded-xl border border-border bg-card" />
            </div>
        </div>
    );
}

function Info({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{label}</span>
            <span className="text-foreground font-medium text-right">
                {value}
            </span>
        </div>
    );
}
