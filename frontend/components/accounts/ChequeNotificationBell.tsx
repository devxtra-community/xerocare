'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { fetchChequeNotifications, Cheque } from '@/lib/finance/accountsApi';
import { formatCurrency } from '@/lib/format';
import { useBranchCurrency } from '@/lib/hooks/useBranchCurrency';

export default function ChequeNotificationBell() {
  const currency = useBranchCurrency();
  const { data } = useQuery({
    queryKey: ['cheque-notifications'],
    queryFn: fetchChequeNotifications,
    refetchInterval: 5 * 60 * 1000, // every 5 minutes
  });

  const [open, setOpen] = React.useState(false);
  const count = data?.count ?? 0;
  const cheques: Cheque[] = data?.data ?? [];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-muted transition-colors"
        aria-label="Cheque notifications"
      >
        <Bell className="h-5 w-5 text-foreground" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-20 w-80 rounded-xl border bg-card shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-semibold text-foreground">Cheque Alerts</span>
              <span className="text-xs text-muted-foreground">Due within 3 days</span>
            </div>
            {cheques.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No upcoming cheques
              </div>
            ) : (
              <ul className="max-h-72 overflow-y-auto divide-y">
                {cheques.map((c) => (
                  <li key={c.id} className="px-4 py-3 hover:bg-muted">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {c.partyName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          #{c.chequeNo} · {c.bankName ?? 'Unknown Bank'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-foreground">
                          {formatCurrency(c.amount, currency)}
                        </p>
                        <p className="text-xs text-destructive font-medium">
                          Due {String(c.dueDate).slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        c.type === 'RECEIVED'
                          ? 'bg-success/10 text-success'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {c.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <a
              href="/finance/accounts/cheques"
              className="block text-center py-2.5 text-xs text-primary hover:text-primary border-t font-medium"
              onClick={() => setOpen(false)}
            >
              View all cheques →
            </a>
          </div>
        </>
      )}
    </div>
  );
}
