import StatCard from "../components/StatCard";

export default function SingleEmployeePage() {
    return (
        <div className="grid grid-cols-12 gap-6">

            {/*LEFT PROFILE*/}
            <div className="col-span-4 rounded-xl bg-white p-6 shadow">
                <img src="/avatar.png" className="mx-auto h-24 w-24 rounded-full" />
                <h2 className="mt-4 text-center font-semibold">Aliana</h2>
                <p className="text-center text-sm text-muted-foreground">aliana700@gmail.com</p>

                <div className="mt-6 space-y-3 text-sm">
                    <Info label="Department" value="Finance" />
                    <Info label="Designation" value="Accountant" />
                    <Info label="Branch" value="Ernakulam" />
                    <Info label="Salary" value="$2200" />
                </div>
            </div>

            {/*RIGHT DASHBOARD*/}
            <div className="col-span-8 space-y-6">
                <div className="grid grid-cols-4 gap-4">
                    <StatCard title="Present Days" value="223" />
                    <StatCard title="Performance Trend" value="75%" />
                    <StatCard title="Tasks Completed" value="43%" />
                    <StatCard title="Leave Balance" value="22" />
                </div>

                <div className="h-64 rounded-xl bg-white shadow" />
                <div className="h-64 rounded-xl bg-white shadow" />
            </div>
        </div>
    )
}


function Info({ label, value }: { label: string; value: string }) {
    return(
    <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
    </div>
    )
}