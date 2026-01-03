
// import AttendanceChart from "@/components/employees/charts/AttandenceChart";
// import AddEmployeeDialog from "@/components/AddEmployeeDialog";
// import UserTable from "@/components/UserTable";
// import PerformanceChart from "@/components/employees/charts/PerfomanceChart";




// export type UserListItem = {
//   id: string;
//   name: string;
//   department: string;
//   branch: string;
//   startDate: string;
//   visaExpiryDate: string;
//   salary: number;
// };


// async function getUsers(): Promise<UserListItem[]> {
//   return [
//     {
//       id: "1",
//       name: "Seving Aslanova",
//       department: "Marketing",
//       branch: "Kochi",
//       startDate: "19.02.2023",
//       visaExpiryDate: "19.02.2025",
//       salary: 1250,
//     },
//     {
//       id: "2",
//       name: "Mark Lue",
//       department: "Finance",
//       branch: "Ernakulam",
//       startDate: "19.05.2023",
//       visaExpiryDate: "19.05.2025",
//       salary: 750,
//     },
//     {
//       id: "3",
//       name: "Aisha Rahman",
//       department: "HR",
//       branch: "Bangalore",
//       startDate: "11.01.2022",
//       visaExpiryDate: "11.01.2026",
//       salary: 3000,
//     },
//   ];
// }



// const hrAttendanceData = [
//   { month: "Jan", attendancePercentage: 82 },
//   { month: "Feb", attendancePercentage: 76 },
//   { month: "Mar", attendancePercentage: 88 },
//   { month: "Apr", attendancePercentage: 79 },
//   { month: "May", attendancePercentage: 91 },
//   { month: "Jun", attendancePercentage: 85 },
// ];

// const hrPerformanceData = [
//   { name: "Task Completed", value: 71 },
//   { name: "Remaining", value: 29 },
// ];

// /* ---------------- PAGE ---------------- */

// export default async function UsersPage() {
//   const users = await getUsers();

//   return (
//     <div className="space-y-6">
//       {/* HEADER */}
//       <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2 sm:px-6">
//         <h1 className="text-xl sm:text-3xl font-serif">
//           Human Resources
//         </h1>
//         <AddEmployeeDialog />
//       </div>

//       {/* HR DASHBOARD CHARTS */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 sm:px-6">
//         <PerformanceChart
//           title="Overall Performance"
//           centerLabel="Completed"
//           data={hrPerformanceData}
//         />

//         <AttendanceChart
//           title="Total Attendance % (All Employees)"
//           data={hrAttendanceData}
//           dataKey="attendancePercentage"
//           yAxisDomain={[0, 100]}
//         />
//       </div>

//       {/* USER TABLE */}
//       <div className="px-2 sm:px-6">
//         <UserTable users={users} />
//       </div>
//     </div>
//   );
// }

// // export default function HRDashboard(){
// //   return(
// //     <div className="space-y-6">
// //       <h1 className="text-2xl font-semibold">HR Dashboard</h1>
// //       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
// //         <StatCard title="Total Employees" value={24} />
// //         <StatCard title="Present Today" value={19} />
// //         <StatCard title="On Leave" value={3} />
// //         <StatCard title="Pending Approvals" value={2} />
// //       </div>
// //     </div>
// //   )
// // }

// // export function StatCard({title,value}:{title:string;value:number;}){
// //   return(
// //     <div className="rounded-xl border bg-card p-4">
// //       <p className="text-sm text-muted-foreground">{title}</p>
// //       <p className="text-2xl font-bold">{value}</p>
// //     </div>
// //   )
// // }

import StatCard from "@/components/StatCard";
import AttendanceChart from "@/components/employees/charts/AttandenceChart";
import PerformanceChart from "@/components/employees/charts/PerfomanceChart";
import AddEmployeeDialog from "@/components/AddEmployeeDialog";
import UserTable from "@/components/UserTable";

/* ---------------- TYPES ---------------- */

export type UserListItem = {
  id: string;
  name: string;
  department: string;
  branch: string;
  startDate: string;
  visaExpiryDate: string;
  salary: number;
};

/* ---------------- MOCK BACKEND ---------------- */

async function getUsers(): Promise<UserListItem[]> {
  return [
    {
      id: "1",
      name: "Seving Aslanova",
      department: "Marketing",
      branch: "Kochi",
      startDate: "19.02.2023",
      visaExpiryDate: "19.02.2025",
      salary: 1250,
    },
    {
      id: "2",
      name: "Mark Lue",
      department: "Finance",
      branch: "Ernakulam",
      startDate: "19.05.2023",
      visaExpiryDate: "19.05.2025",
      salary: 750,
    },
    {
      id: "3",
      name: "Aisha Rahman",
      department: "HR",
      branch: "Bangalore",
      startDate: "11.01.2022",
      visaExpiryDate: "11.01.2026",
      salary: 3000,
    },
  ];
}

/* ---------------- DASHBOARD DATA ---------------- */

const hrAttendanceData = [
  { month: "Jan", attendancePercentage: 82 },
  { month: "Feb", attendancePercentage: 76 },
  { month: "Mar", attendancePercentage: 88 },
  { month: "Apr", attendancePercentage: 79 },
  { month: "May", attendancePercentage: 91 },
  { month: "Jun", attendancePercentage: 85 },
];

const hrPerformanceData = [
  { name: "Completed", value: 71 },
  { name: "Remaining", value: 29 },
];

/* ---------------- PAGE ---------------- */

export default async function HRPage() {
  const users = await getUsers();

  const totalEmployees = users.length;
  const   onLeave = 2; // mock
  const pendingApprovals = 2; // mock

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2 sm:px-6">
        <h1 className="text-xl sm:text-3xl font-serif">
          Human Resources
        </h1>

        {/* HR ADMIN ONLY (RBAC READY) */}
        <AddEmployeeDialog />
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-2 sm:px-6">
        <StatCard title="Total Employees" value={String(totalEmployees)} />
        <StatCard title="Present Today" value="1" />
        <StatCard title="On Leave" value={String(onLeave)} />
        <StatCard
          title="Pending Approvals"
          value={String(pendingApprovals)}
        />
      </div>

      {/* ANALYTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-2 sm:px-6">
        <PerformanceChart
          title="Overall Performance"
          centerLabel="Completed"
          data={hrPerformanceData}
        />

        <AttendanceChart
          title="Attendance Trend (%)"
          data={hrAttendanceData}
          dataKey="attendancePercentage"
          yAxisDomain={[0, 100]}
        />
      </div>

      {/* EMPLOYEE MANAGEMENT */}
      <div className="px-2 sm:px-6 space-y-3">
        <h2 className="text-lg font-semibold">
          Employee Directory
        </h2>

        <UserTable users={users} />
      </div>
    </div>
  );
}

