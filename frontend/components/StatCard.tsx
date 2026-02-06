'use client';

import * as React from 'react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <Card className="rounded-2xl min-h-[70px] sm:h-[80px] !bg-card border-0 shadow-sm">
      <CardContent className="h-full flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center p-1.5 sm:p-2 md:p-3 !bg-card">
        <CardTitle className="font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight">
          {title}
        </CardTitle>

        <div className="text-base sm:text-xl md:text-2xl font-bold text-primary">{value}</div>

        {subtitle && (
          <CardDescription className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">
            {subtitle}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
