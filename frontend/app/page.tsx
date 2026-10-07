import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, MoreHorizontal } from 'lucide-react';

export default function Home() {
  return (
    <div className="h-screen w-full bg-[var(--foreground)] text-primary-foreground selection:bg-primary/30 overflow-hidden flex flex-col">
      {/* 1. Website Header (Company Logo) */}
      <header className="container mx-auto px-6 py-4 flex-none">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="font-bold text-primary-foreground text-base">X</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Xerocare</span>
        </div>
      </header>

      {/* 2. Main Content Area */}
      <main className="container mx-auto px-6 flex-1 flex flex-col justify-center min-h-0">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center h-full max-h-[800px] m-auto">
          {/* Left Side: Welcome Message and "Get Started" Button */}
          <div className="space-y-6 flex flex-col justify-center">
            <div className="w-fit">
              <Badge
                variant="secondary"
                className="bg-primary/20 text-primary hover:bg-primary/30 px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase"
              >
                10k Users Around The World
              </Badge>
            </div>

            <h1 className="text-xl sm:text-2xl sm:text-4xl lg:text-5xls font-medium leading-tight tracking-tight text-primary-foreground">
              Manage Customer and Business{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-info">
                Without Limit
              </span>
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base max-w-lg leading-relaxed">
              Our system helps you keep track of your customers and business performance in one
              place, making sure everything runs smoothly.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link href="/login">
                <Button className="h-10 px-6 rounded-full bg-primary hover:bg-primary/90 text-sm font-semibold w-full sm:w-auto">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side: A preview of what the dashboard looks like */}
          <div className="relative flex items-center justify-center transform scale-90 lg:scale-100">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

            {/* Visual Example: Sales Report Card */}
            <div className="relative z-10 bg-card dark:bg-foreground rounded-2xl p-5 shadow-2xl border border-border/50 w-full max-w-[350px] mx-auto lg:ml-auto lg:mr-0 transform -rotate-2 lg:translate-x-4 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-foreground dark:text-primary-foreground text-base">
                  Sales Overview
                </h3>
                <div className="flex gap-2">
                  <div className="bg-foreground text-primary-foreground text-[10px] px-2 py-1 rounded-full">
                    Month <span className="ml-1">↓</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mb-3">
                <div className="bg-foreground rounded-xl p-2.5 flex-1">
                  <span className="text-[10px] text-muted-foreground block mb-0.5">Profit</span>
                  <span className="text-primary-foreground font-bold text-base">9.2K</span>
                </div>
                <div className="bg-muted dark:bg-foreground rounded-xl p-2.5 flex-1">
                  <span className="text-[10px] text-muted-foreground dark:text-muted-foreground block mb-0.5">
                    Expense
                  </span>
                  <span className="text-foreground dark:text-primary-foreground font-bold text-base">
                    2.6K
                  </span>
                </div>
              </div>

              {/* Simulation of a bar chart showing business growth */}
              <div className="h-24 flex items-end justify-between gap-1.5 px-1">
                {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                  <div
                    key={i}
                    className="w-full bg-muted dark:bg-foreground rounded-t mb-0 relative group"
                  >
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary rounded-t transition-all duration-500 group-hover:bg-primary/20"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground font-medium">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
              </div>
            </div>

            {/* Visual Example: To-Do List Card */}
            <div className="absolute top-12 -left-2 lg:-left-6 z-20 bg-card dark:bg-card rounded-2xl p-4 shadow-[0_15px_40px_rgba(0,0,0,0.3)] w-60 transform rotate-3 hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-foreground text-sm">Upcoming Schedule</h4>
                <MoreHorizontal className="text-muted-foreground w-4 h-4" />
              </div>

              <div className="space-y-3">
                {[
                  {
                    title: 'Analytics Press',
                    time: '09:30 AM',
                    icon: <CheckCircle2 className="w-4 h-4 text-success" />,
                    active: true,
                  },
                  {
                    title: 'Business Sprint',
                    time: '10:35 AM',
                    icon: <div className="w-3 h-3 rounded border-2 border-border" />,
                    active: false,
                  },
                  {
                    title: 'Review Meeting',
                    time: '1:15 PM',
                    icon: <div className="w-3 h-3 rounded border-2 border-border" />,
                    active: false,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-2.5">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <h5
                        className={`text-xs font-semibold ${item.active ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {item.title}
                      </h5>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* LOGOS SECTION */}
        <div className="pt-6 border-t border-border/50 flex-none pb-6">
          <p className="text-center text-muted-foreground text-xs font-medium mb-4">
            Trusted by leading printing technology companies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos represented as text */}
            <div className="text-xl font-bold text-primary-foreground tracking-tight">Canon</div>
            <div className="text-xl font-bold text-primary-foreground tracking-tight">HP</div>
            <div className="text-xl font-bold text-primary-foreground tracking-tight">EPSON</div>
            <div className="text-xl font-bold text-primary-foreground tracking-tight">brother</div>
            <div className="text-xl font-bold text-primary-foreground tracking-tight">Xerox</div>
            <div className="text-xl font-bold text-primary-foreground tracking-tight">RICOH</div>
          </div>
        </div>
      </main>
    </div>
  );
}
