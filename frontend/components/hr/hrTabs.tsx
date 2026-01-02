"use client"
 
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs=[
    {label:"Overview", href:"/HR"},
    {label:"Attendence", href:"/HR/attendence"},
    {label:"Leave", href:"/HR/leave"},
    {label:"Employees", href:"/HR/employees"}
];

export default function HRTabs(){
    const pathname= usePathname();

    return (
    <div className="border-b overflow-x-auto">
      <div className="flex gap-6 min-w-max">
        {tabs.map(tab => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "pb-2 text-sm font-medium whitespace-nowrap",
                active
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );

}