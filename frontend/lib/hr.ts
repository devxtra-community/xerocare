import { OrgPerformanceData } from '@/components/hr/performanceDonutChart';

export type Employee = {
  id: string;
  name: string;
  department: string;
  designation: string;
  branch: string;
  joiningDate: string;
  salary: number;
};

export type EmployeeProfile = {
  id: string;
  name: string;
  designation: string;
  department: string;
  outlet: string;
  joiningDate: string;
  employeeType: string;
  salary: number;
  visaExpiry: string;
  manager: string;
  phone: string;
  email: string;
  address: string;
};

export type UserListItem = {
  id: string;
  name: string;
  designation: string;
  department: string;
  branch: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contract';
  status: 'Active' | 'On Leave' | 'Inactive';
  startDate: string;
  visaExpiryDate: string;
  salary: number;
};

export const employees: UserListItem[] = [
  {
    id: '1',
    name: 'Aisha Rahman',
    designation: 'Hiring Manager',
    department: 'HR',
    branch: 'Kochi',
    employmentType: 'Full-time',
    status: 'Active',
    startDate: '2023-02-19',
    visaExpiryDate: '2026-02-19',
    salary: 3000,
  },
  {
    id: '2',
    name: 'Mark Lue',
    designation: 'Accountant',
    department: 'Finance',
    branch: 'Ernakulam',
    employmentType: 'Contract',
    status: 'On Leave',
    startDate: '2022-05-10',
    visaExpiryDate: '2025-05-10',
    salary: 2500,
  },
  {
    id: '3',
    name: 'Aisha Rahman',
    designation: 'HR Manager',
    department: 'HR',
    branch: 'Kochi',
    employmentType: 'Part-time',
    status: 'Inactive',
    startDate: '2023-02-19',
    visaExpiryDate: '2026-02-19',
    salary: 6000,
  },
  {
    id: '4',
    name: 'Mark Lue',
    designation: 'Analyst',
    department: 'Finance',
    branch: 'Ernakulam',
    employmentType: 'Contract',
    status: 'On Leave',
    startDate: '2022-05-10',
    visaExpiryDate: '2025-05-10',
    salary: 3500,
  },
];

export type DailyAttendance = {
  id: string;
  name: string;
  department: string;
  date: string;
  status: 'Present' | 'Absent' | 'Late' | 'Leave';
  checkIn?: string;
  checkOut?: string;
};

export const dailyAttendance: DailyAttendance[] = [
  {
    id: '1',
    name: 'Aisha Rahman',
    department: 'HR',
    date: '2026-01-02',
    status: 'Present',
    checkIn: '09:05',
    checkOut: '17:45',
  },
  {
    id: '2',
    name: 'Mark Lue',
    department: 'Finance',
    date: '2026-01-02',
    status: 'Late',
    checkIn: '09:35',
    checkOut: '18:10',
  },
  {
    id: '3',
    name: 'Sara Khan',
    department: 'Sales',
    date: '2026-01-02',
    status: 'Absent',
  },
];

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Leave';

export type AttendanceRecord = {
  employeeId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
};

export const attendanceRecords: AttendanceRecord[] = [
  {
    employeeId: '1',
    date: '2026-01-02',
    status: 'Present',
    checkIn: '09:05',
    checkOut: '17:40',
  },
  {
    employeeId: '1',
    date: '2026-01-03',
    status: 'Late',
    checkIn: '09:32',
    checkOut: '18:05',
  },
  {
    employeeId: '2',
    date: '2026-01-02',
    status: 'Absent',
  },
];

export type LeaveType = 'Casual' | 'Sick' | 'Paid';

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export type LeaveRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  type: 'Casual' | 'Sick' | 'Paid';
  from: string;
  to: string;
  days: number;
  status: LeaveStatus;
};

export const leaveRecords: LeaveRecord[] = [
  {
    id: 'l1',
    employeeId: '1',
    employeeName: 'Aisha Rahman',
    department: 'HR',
    type: 'Casual',
    from: '2026-01-05',
    to: '2026-01-06',
    days: 2,
    status: 'Pending',
  },
  {
    id: 'l2',
    employeeId: '2',
    employeeName: 'Mark Lue',
    department: 'Finance',
    type: 'Paid',
    from: '2026-01-10',
    to: '2026-01-14',
    days: 5,
    status: 'Approved',
  },
];

export type EmployeeFilters = {
  department: string;
  employmentType: string;
  status: string;
};

export const orgWorkloadData: OrgPerformanceData[] = [
  { label: 'Completed', value: 58 },
  { label: 'In Progress', value: 22 },
  { label: 'Pending', value: 12 },
  { label: 'Overdue', value: 8 },
];
