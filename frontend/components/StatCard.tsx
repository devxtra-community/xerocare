'use client';

import * as React from 'react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
};

export default function StatCard({ title, value, subtitle }: StatCardProps) {
  // Logic to decrease font size for longer content
  const getFontSizeClass = (text: string) => {
    const len = text ? text.length : 0;
    if (len > 25) return 'text-[10px] sm:text-xs md:text-sm';
    if (len > 15) return 'text-xs sm:text-base md:text-lg';
    return 'text-base sm:text-xl md:text-2xl';
  };

  return (
    <Card className="rounded-2xl min-h-[70px] sm:min-h-[80px] h-full bg-card border-none shadow-sm overflow-hidden flex flex-col p-0">
      <CardContent className="flex-1 flex flex-col items-center justify-center gap-1 text-center p-1 sm:p-2 bg-card rounded-2xl w-full">
        <CardTitle className="font-medium text-muted-foreground text-[10px] sm:text-xs md:text-sm leading-tight uppercase text-center w-full">
          {title}
        </CardTitle>

        <div
          className={`font-bold text-primary leading-snug w-full text-center flex items-center justify-center ${getFontSizeClass(value)}`}
        >
          {value || '0'}
        </div>

        {subtitle && (
          <CardDescription className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground/80 text-center w-full">
            {subtitle}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
