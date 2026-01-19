'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type Period = 'MTD' | 'QTD' | 'YTD';

export default function PeriodSelector({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as Period)}>
      <TabsList className="bg-white border">
        <TabsTrigger value="MTD">MTD</TabsTrigger>
        <TabsTrigger value="QTD">QTD</TabsTrigger>
        <TabsTrigger value="YTD">YTD</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
