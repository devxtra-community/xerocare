'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Award, Trophy, Medal } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { getMyTargets, TargetWithAchievement } from '@/lib/targets';

function currentMonthStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function nextTierNudge(row: TargetWithAchievement): string | null {
  const { target, achievement } = row;
  const sorted = [...target.tiers].sort((a, b) => a.fromPercent - b.fromPercent);
  const next = sorted.find((t) => t.fromPercent > Number(achievement.achievementPercent));
  if (!next) return null;
  const amountNeeded =
    (next.fromPercent / 100) * Number(target.targetAmount) - Number(achievement.achievedAmount);
  if (amountNeeded <= 0) return null;
  return `${formatCurrency(amountNeeded, target.currencyCode)} more to reach the ${next.incentivePercent}% tier`;
}

function rankBadgeClass(rank: number): string {
  if (rank === 1) return 'bg-warning/10 text-warning border-warning/30';
  if (rank === 2) return 'bg-muted text-foreground border-border';
  if (rank === 3) return 'bg-warning/10 text-warning border-warning/30';
  return 'bg-primary/10 text-primary border-primary/30';
}

export default function MyAchievementsPage() {
  const [rows, setRows] = useState<TargetWithAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyTargets()
      .then(setRows)
      .catch(() => toast.error('Failed to load your targets'))
      .finally(() => setLoading(false));
  }, []);

  const currentRow = useMemo(
    () => rows.find((r) => r.target.targetMonth === currentMonthStr()),
    [rows],
  );
  const historyRows = useMemo(
    () =>
      rows
        .filter((r) => r.achievement.isFinalized)
        .sort((a, b) => (a.target.targetMonth < b.target.targetMonth ? 1 : -1)),
    [rows],
  );

  if (loading) {
    return <div className="p-6 text-muted-foreground">Loading your achievements...</div>;
  }

  if (!currentRow && historyRows.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-card dark:bg-foreground p-8 text-center text-muted-foreground">
          <Award className="h-8 w-8 mx-auto mb-2 opacity-50" />
          No target has been assigned to you yet.
        </div>
      </div>
    );
  }

  const percent = currentRow ? Math.min(100, Number(currentRow.achievement.achievementPercent)) : 0;
  const nudge = currentRow ? nextTierNudge(currentRow) : null;

  return (
    <div className="min-h-full p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-medium text-foreground flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" /> My Achievements
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your monthly target progress and incentives
        </p>
      </div>

      {currentRow && (
        <div className="rounded-xl border bg-card dark:bg-foreground p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-lg">{currentRow.target.targetMonth}</h2>
            {currentRow.rank && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${rankBadgeClass(currentRow.rank)}`}
              >
                {currentRow.rank <= 3 ? (
                  <Trophy className="h-3.5 w-3.5" />
                ) : (
                  <Medal className="h-3.5 w-3.5" />
                )}
                You are ranked #{currentRow.rank} in your branch this month
              </span>
            )}
          </div>

          <div className="w-full">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>
                {formatCurrency(
                  currentRow.achievement.achievedAmount,
                  currentRow.target.currencyCode,
                )}{' '}
                / {formatCurrency(currentRow.target.targetAmount, currentRow.target.currencyCode)}
              </span>
              <span className="font-semibold text-primary">
                {Number(currentRow.achievement.achievementPercent).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted dark:bg-foreground rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {nudge && <p className="text-sm text-warning font-medium">{nudge}</p>}

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Current Tier
              </p>
              <p className="text-lg font-bold">
                {Number(currentRow.achievement.appliedTierPercent)}%
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Estimated Incentive
              </p>
              <p className="text-lg font-bold text-success">
                {formatCurrency(
                  currentRow.achievement.incentiveAmount,
                  currentRow.target.currencyCode,
                )}
              </p>
            </div>
          </div>

          {currentRow.records.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Deals counted this month ({currentRow.achievement.dealCount})
              </p>
              <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
                {currentRow.records.map((rec) => (
                  <div key={rec.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium">{rec.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(rec.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(rec.amount, currentRow.target.currencyCode)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {historyRows.length > 0 && (
        <div className="rounded-xl border bg-card dark:bg-foreground overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Monthly History</h3>
          </div>
          <Table pagination={{ pageSize: 10 }}>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Achieved</TableHead>
                <TableHead>%</TableHead>
                <TableHead>Incentive</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRows.map((r) => (
                <TableRow key={r.target.id}>
                  <TableCell>{r.target.targetMonth}</TableCell>
                  <TableCell>
                    {formatCurrency(r.target.targetAmount, r.target.currencyCode)}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(r.achievement.achievedAmount, r.target.currencyCode)}
                  </TableCell>
                  <TableCell>{Number(r.achievement.achievementPercent).toFixed(1)}%</TableCell>
                  <TableCell className="font-semibold text-success">
                    {formatCurrency(r.achievement.incentiveAmount, r.target.currencyCode)}
                  </TableCell>
                  <TableCell>
                    <Badge status="COMPLETED">Finalized</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
