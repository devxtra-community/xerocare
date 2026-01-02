import { LeaveRecord } from "./hr";


export function getEmployeeLeaves(
  employeeId: string,
  records: LeaveRecord[]
) {
  const data = records.filter(l => l.employeeId === employeeId);

  const balance = {
    Casual: 12 - data.filter(l => l.type === "Casual" && l.status === "Approved").reduce((a, b) => a + b.days, 0),
    Sick: 8 - data.filter(l => l.type === "Sick" && l.status === "Approved").reduce((a, b) => a + b.days, 0),
    Paid: 20 - data.filter(l => l.type === "Paid" && l.status === "Approved").reduce((a, b) => a + b.days, 0),
  };

  return { data, balance };
}
