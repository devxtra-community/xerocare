'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface YearSelectorProps {
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  startYear?: number;
  endYear?: number;
  showAllOption?: boolean;
}

export function YearSelector({
  selectedYear,
  onYearChange,
  startYear = 2024,
  endYear = new Date().getFullYear(),
  showAllOption = true,
}: YearSelectorProps) {
  const [availableYears, setAvailableYears] = React.useState<number[]>([]);

  React.useEffect(() => {
    const fetchYears = async () => {
      try {
        const { getAvailableYears } = await import('@/lib/invoice');
        const years = await getAvailableYears();
        if (years && years.length > 0) {
          setAvailableYears(years);
        }
      } catch (error) {
        console.error('Failed to fetch available years:', error);
      }
    };
    fetchYears();
  }, []);

  const years = React.useMemo(() => {
    const yearsArr: (number | 'all')[] = [];
    if (showAllOption) yearsArr.push('all');

    if (availableYears.length > 0) {
      availableYears.forEach((y) => yearsArr.push(y));
    } else {
      for (let year = endYear; year >= startYear; year--) {
        yearsArr.push(year);
      }
    }
    return yearsArr;
  }, [startYear, endYear, showAllOption, availableYears]);

  return (
    <Select
      value={selectedYear.toString()}
      onValueChange={(value) => {
        onYearChange(value === 'all' ? 'all' : parseInt(value, 10));
      }}
    >
      <SelectTrigger className="w-[120px] h-8 text-[11px] font-medium bg-background border-muted-foreground/20 hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <SelectValue placeholder="Select Year" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()} className="text-[11px]">
            {year === 'all' ? 'All Years' : year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
