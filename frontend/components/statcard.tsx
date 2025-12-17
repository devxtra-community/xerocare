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
    <Card className="rounded-2xl h-[100px] !bg-white border-0 shadow-sm">
      <CardContent className="h-full flex flex-col items-center justify-center gap-1 text-center p-4 !bg-white">
        <CardTitle className="font-medium text-muted-foreground text-sm">
          {title}
        </CardTitle>

        <div className="text-2xl font-bold text-primary">
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