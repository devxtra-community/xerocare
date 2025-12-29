    import PerformanceChart from "@/components/employees/charts/PerformanceChart";
    import AddEmployeeDialog from "./components/AddEmployeeDialog";
    import UserTable from "./components/UserTable";
    import AttendanceChart from "@/components/employees/charts/AttendanceChart";

    export type UserListItem = {
    id: number;
    name: string;
    department: string;
    branch: string;
    startDate: string;
    visaexpiryDate: string;
    salary: number;
    };

    async function getUsers(): Promise<UserListItem[]> {
    // 🔹 TEMP mock — backend will replace this
    return [
        {
        id: 1,
        name: "Seving Aslanova",
        department: "Marketing",
        branch: "Kochi",
        startDate: "19.02.2023",
        visaexpiryDate: "19.02.2025",
        salary: 1250,
        },
        {
        id: 2,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 750,
        },
        {
        id: 3,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 6000,
        },
        {
        id: 4,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 1500,
        },
        {
        id: 5,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 800,
        },
        {
        id: 6,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 7000,
        },
        {
        id: 7,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 1000,
        },
        {
        id: 8,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 5000,
        },
        {
        id: 9,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 4000,
        },
        {
        id: 10,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 6000,
        },
        {
        id: 11,
        name: "Mark Lue",
        department: "Finance",
        branch: "Ernakulam",
        startDate: "19.05.2023",
        visaexpiryDate: "19.05.2025",
        salary: 2500,
        },
    ];
    }

    const hrAttendanceData = [
    { month: "Jan", attendancePercentage: 82 },
    { month: "Feb", attendancePercentage: 76 },
    { month: "Mar", attendancePercentage: 88 },
    { month: "Apr", attendancePercentage: 79 },
    { month: "May", attendancePercentage: 91 },
    { month: "Jun", attendancePercentage: 85 },
    ];

    const hrPerformanceData = [
    { name: "Task Completed", value: 71 },
    { name: "Remaining", value: 29 },
    ];

    export default async function UsersPage() {
    const users = await getUsers();

    return (
          <div className="space-y-6 px-2 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <h1 className="text-xl sm:text-3xl font-serif">
          Human Resources
        </h1>
        <AddEmployeeDialog />
      </div>

      {/* HR Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PerformanceChart
          title="Overall Performance"
          centerLabel="Completed"
          data={hrPerformanceData}
        />

        <AttendanceChart
          title="Total Attendance % (All Employees)"
          data={hrAttendanceData}
          dataKey="attendancePercentage"
          yAxisDomain={[0, 100]}
        />
      </div>

      {/* User Table */}
      <div className="mt-2 ">
        <UserTable users={users} />
      </div>

    </div>
  );
    }
