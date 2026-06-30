'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Rectangle,
} from 'recharts';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(v);

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#ec4899',
  '#64748b',
  '#14b8a6',
];

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      No data available
    </div>
  );
}

// ─── Donut / Pie Chart ────────────────────────────────────────────────────────

interface DonutData {
  name: string;
  value: number;
}
interface DonutProps {
  data: DonutData[];
  height?: number;
  colors?: string[];
}

export function DonutChart({ data, height = 300, colors = COLORS }: DonutProps) {
  if (!data?.length)
    return (
      <div style={{ height }}>
        <EmptyState />
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="75%"
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => fmt(v)} />
        <Legend iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Simple Bar Chart ─────────────────────────────────────────────────────────

interface SimpleBarProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; color?: string; label?: string }[];
  height?: number;
  currency?: boolean;
}

export function SimpleBarChart({
  data,
  xKey,
  bars,
  height = 300,
  currency = true,
}: SimpleBarProps) {
  if (!data?.length)
    return (
      <div style={{ height }}>
        <EmptyState />
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={currency ? (v) => `${(v / 1000).toFixed(0)}k` : undefined}
        />
        <Tooltip formatter={(v: number) => (currency ? fmt(v) : v)} />
        {bars.length > 1 && <Legend iconSize={8} />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.label ?? b.key}
            fill={b.color ?? COLORS[i]}
            radius={[3, 3, 0, 0]}
            maxBarSize={40}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────

interface HBarProps {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}

export function HorizontalBarChart({ data, height = 300, color = '#3b82f6' }: HBarProps) {
  if (!data?.length)
    return (
      <div style={{ height }}>
        <EmptyState />
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
        <Tooltip formatter={(v: number) => fmt(v)} />
        <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

interface LineProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; color?: string; label?: string }[];
  height?: number;
}

export function SimpleLineChart({ data, xKey, lines, height = 300 }: LineProps) {
  if (!data?.length)
    return (
      <div style={{ height }}>
        <EmptyState />
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => fmt(v)} />
        {lines.length > 1 && <Legend iconSize={8} />}
        {lines.map((l, i) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            name={l.label ?? l.key}
            stroke={l.color ?? COLORS[i]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Stacked Bar Chart ────────────────────────────────────────────────────────

interface StackedBarProps {
  data: Record<string, unknown>[];
  xKey: string;
  keys: string[];
  height?: number;
}

export function StackedBarChart({ data, xKey, keys, height = 300 }: StackedBarProps) {
  if (!data?.length)
    return (
      <div style={{ height }}>
        <EmptyState />
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => fmt(v)} />
        <Legend iconSize={8} />
        {keys.map((k, i) => (
          <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Capital Movement Waterfall ───────────────────────────────────────────────

interface WaterfallRow {
  name: string;
  value: number;
  start: number;
  fill: string;
}

interface WaterfallProps {
  data: WaterfallRow[];
  height?: number;
}

export function WaterfallChart({ data, height = 300 }: WaterfallProps) {
  if (!data?.length)
    return (
      <div style={{ height }}>
        <EmptyState />
      </div>
    );

  const chartData = data.map((d) => ({
    name: d.name.replace(/_/g, ' '),
    invisible: d.start,
    visible: d.value,
    fill: d.fill,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(
            _: unknown,
            name: string,
            props: { payload?: { visible: number; fill: string } },
          ) => {
            if (name === 'invisible') return null;
            return [fmt(props?.payload?.visible ?? 0), 'Amount'];
          }}
        />
        <Bar dataKey="invisible" stackId="a" fill="transparent" />
        <Bar
          dataKey="visible"
          stackId="a"
          shape={(props: unknown) => {
            const {
              x,
              y,
              width,
              height: h,
              payload,
            } = props as {
              x: number;
              y: number;
              width: number;
              height: number;
              payload: { fill: string };
            };
            return (
              <Rectangle
                x={x}
                y={y}
                width={width}
                height={h}
                fill={payload.fill}
                radius={[3, 3, 0, 0]}
              />
            );
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Area / Composed Chart ────────────────────────────────────────────────────

interface AreaProps {
  data: Record<string, unknown>[];
  xKey: string;
  areas: { key: string; color?: string; label?: string }[];
  height?: number;
}

export function AreaChart({ data, xKey, areas, height = 300 }: AreaProps) {
  if (!data?.length)
    return (
      <div style={{ height }}>
        <EmptyState />
      </div>
    );
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => fmt(v)} />
        {areas.length > 1 && <Legend iconSize={8} />}
        {areas.map((a, i) => (
          <Area
            key={a.key}
            type="monotone"
            dataKey={a.key}
            name={a.label ?? a.key}
            stroke={a.color ?? COLORS[i]}
            fill={a.color ?? COLORS[i]}
            fillOpacity={0.12}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
