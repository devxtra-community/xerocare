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
    <Card className="rounded-2xl h-[85px] sm:h-[100px] !bg-white border-0 shadow-sm">
      <CardContent className="h-full flex flex-col items-center justify-center gap-0.5 sm:gap-1 text-center p-3 sm:p-4 !bg-white">
        <CardTitle className="font-medium text-muted-foreground text-xs sm:text-sm">
          {title}
        </CardTitle>

        <div className="text-xl sm:text-2xl font-bold text-primary">
          {value}
        </div>

        {subtitle && (
          <CardDescription className="text-[10px] sm:text-xs text-muted-foreground">
            {subtitle}
          </CardDescription>
        )}
      </CardContent>
    </Card>
  )
}