import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MoreHorizontal } from 'lucide-react';

export default function Home() {
  return (
    <div className="h-screen w-full bg-[#0F172A] text-white selection:bg-blue-500/30 overflow-hidden flex flex-col">
      {/* Header / Logo */}
      <header className="container mx-auto px-6 py-4 flex-none">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="font-bold text-white text-base">X</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Xerocare</span>
        </div>
      </header>

      <main className="container mx-auto px-6 flex-1 flex flex-col justify-center min-h-0">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center h-full max-h-[800px] m-auto">
          {/* Left: Content */}
          <div className="space-y-6 flex flex-col justify-center">
            <div className="w-fit">
              <Badge
                variant="secondary"
                className="bg-primary/20 text-blue-400 hover:bg-primary/30 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
              >
                10k Users Around The World
              </Badge>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xls font-bold leading-tight tracking-tight text-white">
              Manage Customer and Business{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                Without Limit
              </span>
            </h1>

            <p className="text-slate-400 text-sm sm:text-base max-w-lg leading-relaxed">
              Manage the relation between your business and your customer perfectly with AI-based
              Customer Relationship Management. No more miscommunication, no more business value
              decrease.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link href="/login">
                <Button className="h-10 px-6 rounded-full bg-blue-600 hover:bg-blue-500 text-sm font-semibold w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Visuals (Floating Cards) */}
          <div className="relative flex items-center justify-center transform scale-90 lg:scale-100">
            {/* Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

            {/* Main Card: Sales Overview (Back) */}
            <div className="relative z-10 bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-700/50 w-full max-w-[350px] mx-auto lg:ml-auto lg:mr-0 transform -rotate-2 lg:translate-x-4 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Sales Overview
                </h3>
                <div className="flex gap-2">
                  <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded-full">
                    Month <span className="ml-1">↓</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mb-3">
                <div className="bg-slate-900 rounded-xl p-2.5 flex-1">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Profit</span>
                  <span className="text-white font-bold text-base">9.2K</span>
                </div>
                <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2.5 flex-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">
                    Expense
                  </span>
                  <span className="text-slate-900 dark:text-white font-bold text-base">2.6K</span>
                </div>
              </div>

              {/* Bar Chart Simulation */}
              <div className="h-24 flex items-end justify-between gap-1.5 px-1">
                {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                  <div
                    key={i}
                    className="w-full bg-slate-100 dark:bg-slate-800 rounded-t mb-0 relative group"
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-t transition-all duration-500 group-hover:bg-blue-400"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-400 font-medium">
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
            <div className="absolute top-12 -left-2 lg:-left-6 z-20 bg-white dark:bg-white rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.3)] w-60 transform rotate-3 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-900 text-sm">Upcoming Schedule</h4>
                <MoreHorizontal className="text-slate-400 w-4 h-4" />
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: 'Analytics Press',
                    time: '09:30 AM',
                    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
                    active: true,
                  },
                  {
                    title: 'Business Sprint',
                    time: '10:35 AM',
                    icon: <div className="w-3 h-3 rounded border-2 border-slate-300" />,
                    active: false,
                  },
                  {
                    title: 'Review Meeting',
                    time: '1:15 PM',
                    icon: <div className="w-3 h-3 rounded border-2 border-slate-300" />,
                    active: false,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-2.5">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <h5
                        className={`text-xs font-semibold ${item.active ? 'text-slate-900' : 'text-slate-500'}`}
                      >
                        {item.title}
                      </h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LOGOS SECTION */}
        <div className="pt-6 border-t border-slate-800/50 flex-none pb-6">
          <p className="text-center text-slate-500 text-xs font-medium mb-4">
            Trusted by leading printing technology companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos represented as text */}
            <div className="text-xl font-bold text-white tracking-tight">Canon</div>
            <div className="text-xl font-bold text-white tracking-tight">HP</div>
            <div className="text-xl font-bold text-white tracking-tight">EPSON</div>
            <div className="text-xl font-bold text-white tracking-tight">brother</div>
            <div className="text-xl font-bold text-white tracking-tight">Xerox</div>
            <div className="text-xl font-bold text-white tracking-tight">RICOH</div>
          </div>
        </div>
      </main>
    </div>
  );
}
