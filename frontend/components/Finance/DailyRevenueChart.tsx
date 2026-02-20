'use client';

import React, { useEffect, useState } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ChartTooltipContent } from '@/components/ui/ChartTooltip';
import { YearSelector } from '@/components/ui/YearSelector';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarDays, Loader2 } from 'lucide-react';
import { getGlobalSalesOverview } from '@/lib/invoice';
import { formatCompactNumber } from '@/lib/format';

interface DailyData {
  day: string;
  rent: number;
  sale: number;
  lease: number;
}

interface DailyRevenueChartProps {
  selectedYear?: number | 'all';
  onYearChange?: (year: number | 'all') => void;
}

export default function DailyRevenueChart({
  selectedYear: externalYear,
  onYearChange: onExternalYearChange,
}: DailyRevenueChartProps) {
  const [data, setData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalYear, setInternalYear] = useState<number | 'all'>(new Date().getFullYear());

  const selectedYear = externalYear !== undefined ? externalYear : internalYear;
  const onYearChange = onExternalYearChange || setInternalYear;

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const salesData = await getGlobalSalesOverview(
          '1Y',
          selectedYear === 'all' ? undefined : selectedYear,
        );

        // Get selected month details
        const now = new Date();
        const yearToUse = selectedYear === 'all' ? now.getFullYear() : selectedYear;
        const monthToUse = selectedMonth;
        const daysInMonth = new Date(yearToUse, monthToUse + 1, 0).getDate();

        // Initialize data for all days of the current month
        const fullMonthData: DailyData[] = Array.from({ length: daysInMonth }, (_, i) => ({
          day: `${i + 1}`,
          rent: 0,
          sale: 0,
          lease: 0,
        }));

        // Map fetched data to the correct day
        salesData.forEach((item: { date: string; saleType: string; totalSales: number }) => {
          const date = new Date(item.date);
          // Only include data for the selected month and year
          if (date.getMonth() === monthToUse && date.getFullYear() === yearToUse) {
            const dayIndex = date.getDate() - 1; // 0-based index
            const saleType = item.saleType.toLowerCase() as 'rent' | 'sale' | 'lease';

            if (fullMonthData[dayIndex] && ['rent', 'sale', 'lease'].includes(saleType)) {
              fullMonthData[dayIndex][saleType] += item.totalSales;
            }
          }
        });

        setData(fullMonthData);
      } catch (error) {
        console.error('Failed to fetch daily revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, selectedMonth]);

  if (loading) {
    return (
      <div className="w-full h-[310px] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">
            Daily Revenue ({months[selectedMonth]} {selectedYear === 'all' ? '' : selectedYear})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}
          >
            <SelectTrigger className="w-[120px] h-8 text-[11px] font-medium bg-background">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, idx) => (
                <SelectItem key={month} value={idx.toString()} className="text-[11px]">
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <YearSelector
            selectedYear={selectedYear}
            onYearChange={onYearChange}
            showAllOption={false}
          />
        </div>
      </div>
      <div className="w-full h-[310px] mt-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--chart-grid)" />

            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 11 }}
              dy={10}
              interval="preserveStartEnd"
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--chart-slate-dark)', fontSize: 12 }}
              tickFormatter={(value) => `${formatCompactNumber(value)} QAR`}
            />

            <Tooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) =>
                    `${label} ${months[selectedMonth]} ${selectedYear === 'all' ? '' : selectedYear}`
                  }
                  valueFormatter={(value) => {
                    const val = Number(value);
                    return `QAR ${formatCompactNumber(val)}`;
                  }}
                />
              }
            />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', fontWeight: 500 }}
            />

            {/* Rent Line - Primary (Blue 600) */}
            <Line
              name="Rent"
              type="monotone"
              dataKey="rent"
              stroke="var(--chart-blue)"
              strokeWidth={2}
              dot={{ fill: 'var(--chart-blue)', r: 3 }}
              activeDot={{ r: 5 }}
            />

            {/* Sale Line - Navy (Blue 800) */}
            <Line
              name="Sale"
              type="monotone"
              dataKey="sale"
              stroke="var(--chart-blue-dark)"
              strokeWidth={2}
              dot={{ fill: 'var(--chart-blue-dark)', r: 3 }}
              activeDot={{ r: 5 }}
            />

            {/* Lease Line - Light Blue (Blue 400) */}
            <Line
              name="Lease"
              type="monotone"
              dataKey="lease"
              stroke="var(--chart-blue-soft)"
              strokeWidth={2}
              dot={{ fill: 'var(--chart-blue-soft)', r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
