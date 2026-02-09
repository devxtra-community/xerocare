'use client';

import { Lock } from 'lucide-react';
import MockDashboard from './MockDashboard';

export default function DashboardShowcase() {
  return (
    <div className="relative w-full max-w-[1400px] mx-auto perspective-[2000px] group">
      {/* Container for the dashboards */}
      <div className="relative h-[600px] w-full flex items-center justify-center isolate overflow-hidden">
        {/* Left Dashboard (Tilted) */}
        <div className="absolute left-[-15%] top-10 w-[70%] h-full opacity-40 transform -rotate-y-12 translate-z-[-100px] scale-90 blur-[2px] transition-all duration-700 ease-out group-hover:left-[-18%] group-hover:-rotate-y-15">
          <div className="w-full h-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl pointer-events-none select-none">
            <MockDashboard isBackground />
          </div>
        </div>

        {/* Right Dashboard (Tilted) */}
        <div className="absolute right-[-15%] top-10 w-[70%] h-full opacity-40 transform rotate-y-12 translate-z-[-100px] scale-90 blur-[2px] transition-all duration-700 ease-out group-hover:right-[-18%] group-hover:rotate-y-15">
          <div className="w-full h-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl pointer-events-none select-none">
            <MockDashboard isBackground />
          </div>
        </div>

        {/* Center Dashboard (Main) */}
        <div className="relative w-[85%] h-full transform transition-all duration-700 ease-out z-10">
          <div className="w-full h-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl">
            <MockDashboard />
          </div>
        </div>

        {/* Global Blur Overlay & CTA */}
        <div className="absolute inset-0 z-30 flex items-end justify-center pb-12 pointer-events-none">
          {/* The blur backdrop - Gradient from transparent to blur */}
          <div className="absolute inset-x-0 bottom-0 top-[45%] bg-gradient-to-t from-white via-white/95 to-transparent dark:from-gray-950 dark:via-gray-950/95 backdrop-blur-[2px]" />

          {/* The Content */}
          <div className="relative z-40 text-center p-8 max-w-2xl animate-in slide-in-from-bottom-10 fade-in duration-700 pointer-events-auto">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 backdrop-blur-md shadow-lg border border-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl mb-4 shadow-sm">
              Experience the Power of XeroCare
            </h3>

            <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
              No credit card required • Instant access
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
