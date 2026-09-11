'use client';

import * as React from 'react';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * Tone of the headline figure.
 *
 * A closed set rather than a free className: the point of this component is that every
 * stats strip in the app looks the same, which an arbitrary style string would undo.
 * `negative` is for money leaving (fees, write-offs), `positive` for money landing.
 */
export type StatTone = 'default' | 'positive' | 'negative';

const TONE_CLASS: Record<StatTone, string> = {
  default: 'text-primary',
  positive: 'text-emerald-600',
  negative: 'text-red-600',
};

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  tone?: StatTone;
};

/**
 * Reusable statistics card component.
 * Displays a title, value, and optional subtitle with responsive font sizing.
 */
export default function StatCard({ title, value, subtitle, tone = 'default' }: StatCardProps) {
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
          className={`font-bold leading-snug w-full text-center flex items-center justify-center ${TONE_CLASS[tone]} ${getFontSizeClass(value)}`}
          suppressHydrationWarning
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
