import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StandardChartCardProps {
  title: string;
  description?: string;
  loading?: boolean;
  children: React.ReactNode;
  height?: number | string;
  actions?: React.ReactNode;
}

export function StandardChartCard({
  title,
  description,
  loading = false,
  children,
  height = 350,
  actions,
}: StandardChartCardProps) {
  return (
    <Card className="h-full flex flex-col shadow-sm border-gray-100 dark:border-gray-800">
      {(title || description || actions) && (
        <CardHeader className="pb-4 flex flex-row items-center justify-between border-b border-gray-50/50">
          <div className="space-y-1">
            {title && (
              <CardTitle className="text-base font-semibold text-primary">{title}</CardTitle>
            )}
            {description && <CardDescription className="text-xs">{description}</CardDescription>}
          </div>
          {actions && <div>{actions}</div>}
        </CardHeader>
      )}
      <CardContent className="pt-6 flex-grow">
        {loading ? (
          <div className="w-full flex items-center justify-center" style={{ height }}>
            <div className="w-full h-full flex items-end gap-2 px-4 pb-2">
              <Skeleton className="w-full h-[40%]" />
              <Skeleton className="w-full h-[70%]" />
              <Skeleton className="w-full h-[50%]" />
              <Skeleton className="w-full h-[90%]" />
              <Skeleton className="w-full h-[60%]" />
              <Skeleton className="w-full h-[80%]" />
            </div>
          </div>
        ) : (
          <div className="w-full" style={{ height }}>
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
