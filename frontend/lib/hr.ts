export type Employee = {
  id: string;
  name: string;
  department: string;
  designation: string;
  branch: string;
  joiningDate: string;
  salary: number;
};

export const employees: Employee[] = [
  {
    id: "1",
    name: "Aisha Rahman",
    department: "HR",
    designation: "HR Executive",
    branch: "Bangalore",
    joiningDate: "11-01-2022",
    salary: 3000,
  },
  {
    id: "2",
    name: "Mark Lue",
    department: "Finance",
    designation: "Accountant",
    branch: "Ernakulam",
    joiningDate: "19-05-2023",
    salary: 1500,
  },
];
        
export type DailyAttendance = {
  id: string;
  name: string;
  department: string;
  date: string;
  status: "Present" | "Absent" | "Late" | "Leave";
  checkIn?: string;
  checkOut?: string;
};

export const dailyAttendance: DailyAttendance[] = [
  {
    id: "1",
    name: "Aisha Rahman",
    department: "HR",
    date: "2026-01-02",
    status: "Present",
    checkIn: "09:05",
    checkOut: "17:45",
  },
  {
    id: "2",
    name: "Mark Lue",
    department: "Finance",
    date: "2026-01-02",
    status: "Late",
    checkIn: "09:35",
    checkOut: "18:10",
  },
  {
    id: "3",
    name: "Sara Khan",
    department: "Sales",
    date: "2026-01-02",
    status: "Absent",
  },
];

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Leave";

export type AttendanceRecord = {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
};

export const attendanceRecords: AttendanceRecord[] = [
  {
    employeeId: "1",
    date: "2026-01-02",
    status: "Present",
    checkIn: "09:05",
    checkOut: "17:40",
  },
  {
    employeeId: "1",
    date: "2026-01-03",
    status: "Late",
    checkIn: "09:32",
    checkOut: "18:05",
  },
  {
    employeeId: "2",
    date: "2026-01-02",
    status: "Absent",
  },
];

export type LeaveType = "Casual" | "Sick" | "Paid";

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type LeaveRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: "Casual" | "Sick" | "Paid";
  from: string;
  to: string;
  days: number;
  status: LeaveStatus;
};

export const leaveRecords: LeaveRecord[] = [
  {
    id: "l1",
    employeeId: "1",
    employeeName: "Aisha Rahman",
    department: "HR",
    type: "Casual",
    from: "2026-01-05",
    to: "2026-01-06",
    days: 2,
    status: "Pending",
  },
  {
    id: "l2",
    employeeId: "2",
    employeeName: "Mark Lue",
    department: "Finance",
    type: "Paid",
    from: "2026-01-10",
    to: "2026-01-14",
    days: 5,
    status: "Approved",
  },
];
