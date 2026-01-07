'use client';

import { Search, Bell, HelpCircle, ChevronDown, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useEffect, useState } from 'react';
import { getProfile } from '@/lib/auth';

type DashboardHeaderProps = {
  title?: string;
};

export default function DashboardHeader({
  title = "Dashboard",
}: DashboardHeaderProps) {
  const [user, setUser] = useState({
    name: '',
    email: '',
    initial: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        if (res.success && res.data) {
          const { name, email } = res.data;
          setUser({
            name: name || 'User',
            email: email || '',
            initial: name ? name.charAt(0).toUpperCase() : 'U',
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      }
    };
    fetchProfile();
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-sidebar text-white">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 gap-2">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="lg:hidden text-white hover:bg-white/10">
            <Menu className="h-5 w-5" />
          </SidebarTrigger>
          <h1 className="text-base sm:text-lg font-semibold">{title}</h1>
        </div>

        {/* Center: Search bar (hidden on mobile) */}
        <div className="hidden md:flex flex-1 items-center justify-center px-4">
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
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 h-8 w-8 sm:h-10 sm:w-10"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* Help (hidden on mobile) */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:flex text-white hover:bg-white/10"
          >
            <HelpCircle className="h-5 w-5" />
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-white/20">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/20 flex items-center justify-center text-xs sm:text-sm font-medium">
              {user.initial}
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-gray-300">{user.email}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-white hover:bg-white/10 h-6 w-6"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
