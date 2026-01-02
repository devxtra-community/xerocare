import { AttendanceRecord } from "./hr";


export function getEmployeeAttendance(
  employeeId: string,
  records: AttendanceRecord[]
) {
  const data = records.filter(r => r.employeeId === employeeId);

  const summary = {
    present: data.filter(d => d.status === "Present").length,
    absent: data.filter(d => d.status === "Absent").length,
    late: data.filter(d => d.status === "Late").length,
    leave: data.filter(d => d.status === "Leave").length,
  };

  return { data, summary };
}

