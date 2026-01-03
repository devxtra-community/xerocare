import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  MoreHorizontal,
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-white selection:bg-blue-500/30">
      {/* Header / Logo */}
      <header className="container mx-auto px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="font-bold text-white text-lg">X</span>
          </div>
          <span className="text-xl font-bold tracking-tight">Xerocare</span>
        </div>
      </header>
      <main className="container mx-auto px-6 py-12 md:py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            <Badge
              variant="secondary"
              className="bg-blue-900/30 text-blue-400 hover:bg-blue-900/40 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase"
            >
              10k Users Around The World
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white">
              Manage Customer and Business{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Without Limit
              </span>
            </h1>

            <p className="text-slate-400 text-lg sm:text-xl max-w-xl leading-relaxed">
              Manage the relation between your business and your customer perfectly
              with AI-based Customer Relationship Management. No more
              miscommunication, no more business value decrease.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link href="/login">
                <Button className="h-12 px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-base font-semibold w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Visuals (Floating Cards) */}
          <div className="relative mt-8 lg:mt-0">
            {/* Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

            {/* Main Card: Sales Overview (Back) */}
            <div className="relative z-10 bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-700/50 w-full max-w-md mx-auto lg:ml-auto lg:mr-0 transform -rotate-2 lg:translate-x-4 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">
                  Sales Overview
                </h3>
                <div className="flex gap-2">
                  <div className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full">
                    Month <span className="ml-1">↓</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="bg-slate-900 rounded-2xl p-3 flex-1">
                  <span className="text-xs text-slate-400 block mb-1">Profit</span>
                  <span className="text-white font-bold text-lg">9.2K</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-3 flex-1">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                    Expense
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold text-lg">
                    2.6K
                  </span>
                </div>
              </div>

              {/* Bar Chart Simulation */}
              <div className="h-32 flex items-end justify-between gap-2 px-2">
                {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                  <div key={i} className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-lg relative group">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t-lg transition-all duration-500 group-hover:bg-blue-400"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
              </div>
            </div>

            {/* Floating Card: Upcoming Schedule (Front) */}
            <div className="absolute top-20 -left-6 lg:-left-12 z-20 bg-white dark:bg-white rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-72 transform rotate-3 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-slate-900">Upcoming Schedule</h4>
                <MoreHorizontal className="text-slate-400 w-5 h-5" />
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: 'Business Analytics Press',
                    time: '09:30 AM',
                    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,
                    active: true,
                  },
                  {
                    title: 'Business Sprint',
                    time: '10:35 AM',
                    icon: <div className="w-4 h-4 rounded border-2 border-slate-300" />,
                    active: false,
                  },
                  {
                    title: 'Customer Review Meeting',
                    time: '1:15 PM',
                    icon: <div className="w-4 h-4 rounded border-2 border-slate-300" />,
                    active: false,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <h5
                        className={`text-sm font-semibold ${item.active ? 'text-slate-900' : 'text-slate-500'}`}
                      >
                        {item.title}
                      </h5>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {item.time} • David & 2+ more
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LOGOS SECTION */}
        <div className="mt-24 lg:mt-32 pt-10 border-t border-slate-800">
          <p className="text-center text-slate-500 text-sm font-medium mb-8">
            Trusted by leading printing technology companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos represented as text */}
            <div className="text-2xl font-bold text-white tracking-tight">Canon</div>
            <div className="text-2xl font-bold text-white tracking-tight">HP</div>
            <div className="text-2xl font-bold text-white tracking-tight">EPSON</div>
            <div className="text-2xl font-bold text-white tracking-tight">brother</div>
            <div className="text-2xl font-bold text-white tracking-tight">Xerox</div>
            <div className="text-2xl font-bold text-white tracking-tight">RICOH</div>
          </div>
        </div>
      </main>
    </div>
  );
}
