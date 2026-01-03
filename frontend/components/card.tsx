import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function SimpleCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-6">{children}</CardContent>
    </Card>
  );
}
