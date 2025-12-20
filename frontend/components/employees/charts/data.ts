// types/employee-charts.ts

export type AttendancePoint = {
  month: string;
  days: number;
};

export type WorkingHoursPoint = {
  day: string;
  hours: number;
};

export type PerformancePoint = {
  name: string;
  value: number;
};
