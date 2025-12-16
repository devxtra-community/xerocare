import * as React from "react"
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

type StatCardProps = {
  title: string
  value: string
  subtitle?: string
}

export function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex flex-col items-center justify-center gap-1.5 py-6 text-center">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        {/* Brand color from --primary */}
        <div className="text-2xl font-semibold text-primary">
          {value}
        </div>

        {subtitle && (
          <CardDescription className="text-xs text-muted-foreground">
            {subtitle}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
}
