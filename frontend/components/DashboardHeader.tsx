"use client"

import { Search, Bell, HelpCircle, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[#003F7D] text-white">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Dashboard text */}
        <div className="flex items-center">
          <h1 className="text-lg font-semibold">Dashboard</h1>
        </div>

        {/* Center: Search bar */}
        <div className="flex flex-1 items-center justify-center px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="search"
              placeholder="Search"
              className="w-full pl-10 pr-4 bg-white/10 border-white/20 text-white placeholder:text-gray-300 focus-visible:ring-white/50"
            />
          </div>
        </div>

        {/* Right: Icons and User Profile */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
          </Button>

          {/* Help */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-4 border-l border-white/20">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium">
              R
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">Riyas</span>
              <span className="text-xs text-gray-300">riyas@gmail.com</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 h-6 w-6"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

