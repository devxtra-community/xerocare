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
  LabelList,
} from 'recharts';

/**
 * The chart system behind every Accounts analytics panel (AR, AP, Expenses, Equity,
 * Assets, Cash & Bank, P&L, Depreciation — finance, admin and manager alike).
 *
 * Every component here obeys the same handful of specs so that two charts sitting in
 * one card read as one instrument rather than two widgets: thin marks, a hairline
 * solid grid, recessive axis ink, values in the tooltip at full precision and on the
 * axis compacted, and text that never wears the series colour.
 */

/** Surface colour the charts are drawn on — also the colour of the gaps between marks. */
const SURFACE = '#ffffff';

const INK = '#0f172a';
const INK_LABEL = '#475569';
const INK_MUTED = '#64748b';
const INK_FAINT = '#94a3b8';

/** One step off the surface. Hairline and solid: a dashed grid reads as a threshold. */
const GRID_STROKE = '#eef2f6';

/**
 * Bars are capped, never stretched to fill their slot. A five-bucket aging chart across
 * a full-width card was drawing 44px blocks — the "thick saturated blocks" that make a
 * dashboard read as loud. The leftover band is meant to be air.
 */
const BAR_MAX = 24;

const AXIS_TICK = { fontSize: 11, fill: INK_MUTED } as const;
const CATEGORY_TICK = { fontSize: 11, fill: INK_LABEL } as const;

/**
 * Marks are drawn, not animated in.
 *
 * These charts sit behind filters, so recharts' default mount animation replayed a
 * grow-from-zero every time a date range or a type filter changed — motion that carries
 * no information and delays the number the reader came for. Drawing them directly also
 * means the chart is whatever it is the instant it renders, which is what makes it
 * checkable in a screenshot or a print.
 */
const NO_MOUNT_ANIMATION = { isAnimationActive: false } as const;

const BAR_CURSOR = { fill: 'rgba(15,23,42,0.04)' } as const;
const LINE_CURSOR = { stroke: '#cbd5e1', strokeWidth: 1 } as const;

/**
 * Legend labels in ink, not in the series colour.
 *
 * Recharts tints each legend label with its series hue by default, which puts meaning
 * into text colour — unreadable to anyone who cannot separate those hues, and three of
 * this palette's six colours fall below 3:1 against the card, so the words were thin and
 * pale as well. The swatch beside the label already carries identity; the text only has
 * to be legible.
 */
const LEGEND_PROPS = {
  iconType: 'circle' as const,
  iconSize: 8,
  wrapperStyle: { paddingTop: 6 },
  formatter: (value: string) => (
    <span style={{ color: INK_LABEL, fontSize: 11, fontWeight: 600 }}>{prettyLabel(value)}</span>
  ),
};

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

/**
 * Reserved for the folded tail of a donut — deliberately outside the categorical set.
 *
 * It has to be a neutral (an "Other" bucket that wears an identity hue claims to be a
 * category), but it still shares a ring with slots 1-6, so it was run through the palette
 * validator alongside them: the first choice, `#94a3b8`, came back at deutan ΔE 4.6 and
 * normal-vision ΔE 10.2 against the cyan slot — indistinguishable from it. This step
 * clears both (worst adjacent pair 18.9 normal, and the categorical pairs unchanged at
 * 8.9 protan). The validator still reports it under the chroma floor, which is the check
 * that stops an identity hue from reading as gray; here reading as gray is the point.
 */
const OTHER_COLOR = '#64748b';

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Tooltip money: full precision, because the tooltip is where the exact figure lives. */
function makeFmt(currency: string, digits = 2) {
  return (v: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(v) || 0);
}

function grouped(v: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(v) || 0);
}

/** Direct labels riding a mark: grouped, no decimals, no repeated currency code. */
function labelNumber(v: number): string {
  return grouped(v);
}

/**
 * Axis tick labels that survive the scale they are drawn at.
 *
 * Every axis here used `(v / 1000).toFixed(0) + 'K'`, which rounds a 550 tick to "1K"
 * and a 170 tick to "0K". On a branch turning over hundreds rather than millions that
 * produced axes reading "1K 1K 1K 0K 0K" — five ticks, three of them the same label,
 * none of them the value. An axis that cannot tell its own ticks apart is worse than
 * no axis.
 *
 * So the unit follows the magnitude instead of being assumed: plain numbers below a
 * thousand, K above it, M above a million, and one decimal only when dropping it would
 * collide with the neighbouring tick.
 */
export function compactAxisTick(v: number): string {
  const n = Number(v) || 0;
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));
  if (abs < 1_000_000) {
    const k = n / 1000;
    return `${Math.abs(k) < 10 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)}K`;
  }
  const m = n / 1_000_000;
  return `${Math.abs(m) < 10 ? m.toFixed(1).replace(/\.0$/, '') : Math.round(m)}M`;
}

/**
 * A "nice" axis: clean step sizes, and the same unit on every tick.
 *
 * Left to itself recharts divides the data range into five equal parts, so a panel
 * topping out at 21,300 produced ticks of 0 / 5.5K / 11K / 16.5K / 22K — arithmetically
 * correct and unreadable, because nobody holds 16.5K in their head while comparing bars.
 * Steps are snapped to 1, 2, 2.5 or 5 times a power of ten, which is the set of intervals
 * people actually count in.
 */
function niceStep(range: number, round: boolean): number {
  if (range <= 0) return 1;
  const exp = Math.floor(Math.log10(range));
  const f = range / Math.pow(10, exp);
  let nf: number;
  if (round) {
    if (f < 1.5) nf = 1;
    else if (f < 3) nf = 2;
    else if (f < 7) nf = 5;
    else nf = 10;
  } else {
    if (f <= 1) nf = 1;
    else if (f <= 2) nf = 2;
    else if (f <= 5) nf = 5;
    else nf = 10;
  }
  return nf * Math.pow(10, exp);
}

interface Scale {
  domain: [number, number];
  ticks: number[];
  /** Formatter chosen once for the whole axis, so 750 and 1000 never appear as "750" and "1K". */
  format: (v: number) => string;
}

function niceScale(values: number[], maxTicks = 5): Scale {
  const finite = values.map((v) => Number(v) || 0).filter((v) => Number.isFinite(v));
  // A baseline of zero is always included: a bar chart whose axis starts at the smallest
  // bar exaggerates every difference on it.
  const lo = Math.min(0, ...finite);
  const hi = Math.max(0, ...finite);
  const span = hi - lo || 1;
  const step = niceStep(niceStep(span, false) / Math.max(1, maxTicks - 1), true);
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step * 0.5; v += step) ticks.push(Number(v.toFixed(6)));
  return {
    domain: [min, max],
    ticks,
    format: makeAxisFormatter(Math.max(Math.abs(min), Math.abs(max))),
  };
}

/**
 * One unit for the whole axis, picked from its largest tick — not per tick. Deciding tick
 * by tick is what gave an aging axis reading "0 250 500 750 1K", switching scale in its
 * own last step.
 */
function makeAxisFormatter(maxAbs: number): (v: number) => string {
  if (maxAbs >= 1_000_000) {
    return (v: number) => (v === 0 ? '0' : `${Number((v / 1_000_000).toFixed(2))}M`);
  }
  if (maxAbs >= 10_000) {
    return (v: number) => (v === 0 ? '0' : `${Number((v / 1000).toFixed(1))}K`);
  }
  return grouped;
}

/** Every numeric value a set of series contributes, for scaling. */
function seriesValues(data: Record<string, unknown>[], keys: string[]): number[] {
  return (data ?? []).flatMap((row) => keys.map((k) => Number(row[k]) || 0));
}

/** Stacked bars are scaled by the height of the stack, not of its tallest segment. */
function stackTotals(data: Record<string, unknown>[], keys: string[]): number[] {
  return (data ?? []).map((row) => keys.reduce((sum, k) => sum + (Number(row[k]) || 0), 0));
}

/**
 * Enum keys arrive from the API as they are stored, so the AR donut was legending itself
 * "CREDIT_EXCHANGE_RECEIPT / PRODUCT_SALE / SERVICE" — database identifiers printed at a
 * customer-facing dashboard.
 *
 * Only strings that are entirely upper case are touched, so a category someone typed in
 * mixed case is passed through untouched; and tokens of three characters or fewer keep
 * their case, because those are the acronyms (VAT, AMC, UAE, TAX) that title-casing would
 * turn into words.
 */
export function prettyLabel(raw: string): string {
  const s = String(raw ?? '').trim();
  if (!s || !/^[A-Z0-9_ /&()+.-]+$/.test(s)) return s;
  return s
    .replace(/_/g, ' ')
    .split(/\s+/)
    .map((w) => (w.length <= 3 ? w : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(' ');
}

/** Cuts a category name to one line rather than letting the axis wrap it into three. */
function truncate(s: string, max: number): string {
  const t = String(s ?? '');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

/** True when there is nothing worth drawing — no rows, or every value is zero. */
function isBlank(values: number[]): boolean {
  return values.length === 0 || values.every((v) => !Number(v));
}

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-gray-400">
      No data available
    </div>
  );
}

function Blank({ height }: { height: number }) {
  return (
    <div style={{ height }}>
      <EmptyState />
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  fmt: (v: number) => string;
  /** Series rows to drop — the waterfall's transparent spacer, for one. */
  hideKeys?: string[];
  /** Shown under the heading when the mark itself is the subject (donut slices). */
  totalForShare?: number;
}

/**
 * One tooltip for every chart in the module.
 *
 * The default recharts tooltip prints `name : value` as running text, so a two-series
 * month gave two lines that had to be read rather than scanned. This aligns the values
 * on their own right-hand column in tabular figures, which is how a set of numbers is
 * compared.
 */
function ChartTooltip({
  active,
  payload,
  label,
  fmt,
  hideKeys = [],
  totalForShare,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter(
    (p) => p && p.value != null && !hideKeys.includes(String(p.dataKey ?? '')),
  );
  if (!rows.length) return null;

  return (
    <div
      style={{
        background: SURFACE,
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        boxShadow: '0 6px 20px rgba(15,23,42,0.10)',
        padding: '8px 10px',
        minWidth: 150,
      }}
    >
      {label != null && label !== '' && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: INK,
            marginBottom: 6,
            paddingBottom: 6,
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {prettyLabel(String(label))}
        </div>
      )}
      {rows.map((r, i) => {
        const value = Number(r.value) || 0;
        const share =
          totalForShare && totalForShare > 0
            ? ` · ${((value / totalForShare) * 100).toFixed(1)}%`
            : '';
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 11,
              lineHeight: '18px',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: r.color ?? INK_FAINT,
                flex: '0 0 auto',
              }}
            />
            <span style={{ color: INK_MUTED, flex: 1 }}>{prettyLabel(String(r.name ?? ''))}</span>
            <span
              style={{
                color: INK,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {fmt(value)}
              {share}
            </span>
          </div>
        );
      })}
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
  currency?: string;
}

/** Past six slices a donut stops being read, and the 9th hue stops being distinguishable. */
const DONUT_MAX_SLICES = 6;

export function DonutChart({ data, height = 300, colors = COLORS, currency = 'AED' }: DonutProps) {
  const fmt = makeFmt(currency);
  // A donut of all-zero slices draws nothing but still renders its legend — which is
  // how "Payable by Type" ended up as two floating labels above empty space.
  if (isBlank((data ?? []).map((d) => Number(d.value)))) return <Blank height={height} />;

  // Largest first, and everything past the sixth folded into one grey "Other" slice:
  // cycling the palette for a 9th category produces a hue nobody can separate from an
  // earlier one, and a legend that long crowds the ring out of its own card.
  const sorted = [...(data ?? [])]
    .map((d) => ({ name: String(d.name ?? ''), value: Number(d.value) || 0 }))
    .filter((d) => d.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const head = sorted.slice(0, DONUT_MAX_SLICES);
  const tail = sorted.slice(DONUT_MAX_SLICES);
  const slices = tail.length
    ? [...head, { name: `Other (${tail.length})`, value: tail.reduce((s, d) => s + d.value, 0) }]
    : head;

  const total = slices.reduce((sum, d) => sum + d.value, 0);
  const fillOf = (i: number) =>
    tail.length && i === slices.length - 1 ? OTHER_COLOR : colors[i % colors.length];

  // Two columns once the list is long enough to eat the ring's height.
  const legendCols = slices.length > 4 ? 2 : 1;

  /*
   * The figure in the hole has to be measured against the hole, not assumed to fit it.
   * At height 200 with a seven-row legend the ring is small enough that "AED 29,450" at a
   * fixed 14px ran out past both sides of the ring — a total printed over its own chart.
   * The legend's height is known here, so the ring's is too; the type size follows it, and
   * only a figure that will not fit even at the floor size falls back to the compact form.
   */
  const legendRows = Math.ceil(slices.length / legendCols);
  const ringHeight = Math.max(60, height - (legendRows * 17 + 6));
  // 0.9 of the inner diameter, since a narrow card can constrain the ring by width instead.
  const holeWidth = ringHeight * 0.58 * 0.9;
  const CHAR_W = 0.55; // width of a digit as a fraction of font size, for this weight
  const fullTotal = `${currency} ${grouped(total)}`;
  const idealFont = Math.floor(holeWidth / (fullTotal.length * CHAR_W));
  const useCompact = idealFont < 10;
  const holeText = useCompact ? `${currency} ${compactAxisTick(total)}` : fullTotal;
  const totalFont = useCompact
    ? Math.max(9, Math.min(14, Math.floor(holeWidth / (holeText.length * CHAR_W))))
    : Math.min(15, idealFont);

  return (
    <div style={{ height }} className="flex flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="80%"
              {...NO_MOUNT_ANIMATION}
              // A 2px stroke in the surface colour is the gap between segments, not a
              // border around them — the ring reads as separated pieces, not outlines.
              stroke={SURFACE}
              strokeWidth={2}
            >
              {slices.map((_, i) => (
                <Cell key={i} fill={fillOf(i)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip fmt={fmt} totalForShare={total} />} />
            {/* The hole is the natural place for the figure the ring adds up to; without
                it the reader has to sum the segments by eye to learn the total. */}
            <text
              x="50%"
              y="50%"
              dy={-Math.round(totalFont * 0.3)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: totalFont, fontWeight: 800, fill: INK }}
            >
              {holeText}
            </text>
            <text
              x="50%"
              y="50%"
              dy={Math.round(totalFont * 0.85)}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: 9, fontWeight: 700, fill: INK_FAINT, letterSpacing: '0.08em' }}
            >
              TOTAL
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/*
       * The legend carries the numbers as well as the identities. Recharts' own legend
       * gives names only, which left the reader hovering every segment one at a time to
       * find out what any of them was worth.
       */}
      {/* Capped so the percentage stays next to the name it belongs to: stretched across a
          full-width card, label and value read as two separate columns. */}
      <ul
        className={`mt-1 grid gap-x-4 gap-y-0.5 px-1 ${
          legendCols === 1 ? 'mx-auto w-full max-w-[260px]' : 'w-full'
        }`}
        style={{ gridTemplateColumns: `repeat(${legendCols}, minmax(0, 1fr))` }}
      >
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-1.5 text-[11px] leading-[17px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: fillOf(i) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-medium" style={{ color: INK_LABEL }}>
              {prettyLabel(s.name)}
            </span>
            <span className="shrink-0 font-semibold tabular-nums" style={{ color: INK }}>
              {total ? `${Math.round((s.value / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Simple Bar Chart ─────────────────────────────────────────────────────────

interface SimpleBarProps {
  data: Record<string, unknown>[];
  xKey: string;
  bars: { key: string; color?: string; label?: string }[];
  height?: number;
  currency?: boolean | string;
}

export function SimpleBarChart({
  data,
  xKey,
  bars,
  height = 300,
  currency = true,
}: SimpleBarProps) {
  const currencyCode = typeof currency === 'string' ? currency : 'AED';
  const showCurrency = currency !== false;
  const fmt = showCurrency ? makeFmt(currencyCode) : (v: number) => labelNumber(v);
  if (isBlank((data ?? []).flatMap((row) => bars.map((b) => Number(row[b.key])))))
    return <Blank height={height} />;

  const scale = niceScale(
    seriesValues(
      data,
      bars.map((b) => b.key),
    ),
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="28%"
        // The 2px surface gap between two touching bars of a group.
        barGap={2}
      >
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          tickFormatter={(v) => prettyLabel(String(v))}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          domain={scale.domain}
          ticks={scale.ticks}
          tickFormatter={scale.format}
        />
        <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={BAR_CURSOR} />
        {bars.length > 1 && <Legend {...LEGEND_PROPS} />}
        {bars.map((b, i) => (
          <Bar
            key={b.key}
            dataKey={b.key}
            name={b.label ?? b.key}
            fill={b.color ?? COLORS[i]}
            // Rounded at the data end, square on the baseline every bar grows from.
            radius={[4, 4, 0, 0]}
            maxBarSize={BAR_MAX}
            {...NO_MOUNT_ANIMATION}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Horizontal Bar Chart (ranked) ────────────────────────────────────────────

interface HBarProps {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
  currency?: string;
}

/** One line of text, never wrapped — see the note on `nameWidth` below. */
function CategoryTick(props: { x?: number; y?: number; payload?: { value?: string | number } }) {
  const { x = 0, y = 0, payload } = props;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      style={{ fontSize: CATEGORY_TICK.fontSize, fill: CATEGORY_TICK.fill }}
    >
      {String(payload?.value ?? '')}
    </text>
  );
}

/**
 * The ranked list — top customers, top vendors.
 *
 * Every bar carries its own figure at the tip, so the x-axis and its vertical grid are
 * gone: they existed only to let the reader estimate a value that is now printed. That
 * is also why a single flat hue is right here and a darker-where-bigger ramp would be
 * wrong — length already encodes magnitude, and these categories (customers, vendors)
 * have no intrinsic order for a ramp to represent.
 */
export function HorizontalBarChart({
  data,
  height = 300,
  color = '#3b82f6',
  currency = 'AED',
}: HBarProps) {
  const fmt = makeFmt(currency);
  if (isBlank((data ?? []).map((d) => Number(d.value)))) return <Blank height={height} />;

  const NAME_MAX = 20;
  const rows = [...(data ?? [])]
    .map((d) => ({ name: truncate(String(d.name ?? ''), NAME_MAX), value: Number(d.value) || 0 }))
    .sort((a, b) => b.value - a.value);
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 0);
  /*
   * Recharts measures each axis label and wraps it at a space when it believes the label
   * exceeds the axis width — which broke "NADHIL CUSTOMER" and "Gulf Office Supplies" onto
   * two lines even after the column was widened past their measured length. Rendering the
   * tick ourselves takes the guess out of it: one <text>, no wrapping, ever. The names are
   * cut to a single line before that, and the tooltip carries the full one.
   */
  const nameWidth = Math.min(
    190,
    Math.max(90, Math.round(Math.max(...rows.map((r) => r.name.length), 4) * 6.6) + 20),
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        layout="vertical"
        data={rows}
        margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
        barCategoryGap="26%"
      >
        {/* Headroom so the tip label has somewhere to sit instead of being clipped by
            the plot edge — the longest bar would otherwise run to the boundary. */}
        <XAxis type="number" domain={[0, max * 1.22 || 1]} hide />
        <YAxis
          type="category"
          dataKey="name"
          tick={<CategoryTick />}
          tickLine={false}
          axisLine={false}
          width={nameWidth}
          interval={0}
        />
        <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={BAR_CURSOR} />
        <Bar
          dataKey="value"
          name="Amount"
          fill={color}
          radius={[0, 4, 4, 0]}
          maxBarSize={BAR_MAX}
          {...NO_MOUNT_ANIMATION}
        >
          <LabelList
            dataKey="value"
            position="right"
            offset={8}
            formatter={(v: number) => (Number(v) ? labelNumber(Number(v)) : '')}
            style={{ fontSize: 11, fontWeight: 700, fill: INK_LABEL }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Single-period fallback ───────────────────────────────────────────────────

interface SeriesSpec {
  key: string;
  color?: string;
  label?: string;
}

/**
 * What a trend panel shows when there is only one period on record.
 *
 * A line needs two points to draw one, so a single month was rendering as two bare dots
 * in an otherwise empty plot — a panel that reads as broken rather than as young — and
 * the direct labels that were meant to rescue it landed on top of each other whenever the
 * two series were close in value, which for issued-vs-collected is most of the time.
 * One period is a number, not a trend, so it is shown as numbers.
 */
function SinglePeriodStats({
  row,
  xKey,
  series,
  height,
  currency,
}: {
  row: Record<string, unknown>;
  xKey: string;
  series: SeriesSpec[];
  height: number;
  currency: string;
}) {
  const fmt = makeFmt(currency, 0);
  const period = String(row?.[xKey] ?? '');
  return (
    <div style={{ height }} className="flex flex-col justify-center gap-3 px-1">
      {period && (
        <div
          className="text-[10px] font-bold uppercase"
          style={{ color: INK_FAINT, letterSpacing: '0.08em' }}
        >
          {period}
        </div>
      )}
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${Math.min(series.length, 3)}, minmax(0, 1fr))` }}
      >
        {series.map((sp, i) => (
          <div
            key={sp.key}
            className="rounded-xl border px-3 py-2.5"
            style={{ borderColor: GRID_STROKE }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: sp.color ?? COLORS[i] }}
                aria-hidden
              />
              <span className="text-[11px] font-semibold" style={{ color: INK_LABEL }}>
                {prettyLabel(sp.label ?? sp.key)}
              </span>
            </div>
            <div className="mt-1 text-lg font-bold leading-tight" style={{ color: INK }}>
              {fmt(Number(row?.[sp.key]) || 0)}
            </div>
          </div>
        ))}
      </div>
      <div className="text-[11px]" style={{ color: INK_FAINT }}>
        Only one period on record — a trend line needs at least two.
      </div>
    </div>
  );
}

// ─── Line Chart ───────────────────────────────────────────────────────────────

interface LineProps {
  data: Record<string, unknown>[];
  xKey: string;
  lines: { key: string; color?: string; label?: string }[];
  height?: number;
  currency?: string;
}

export function SimpleLineChart({ data, xKey, lines, height = 300, currency = 'AED' }: LineProps) {
  const fmt = makeFmt(currency);
  if (isBlank((data ?? []).flatMap((row) => lines.map((l) => Number(row[l.key])))))
    return <Blank height={height} />;

  if (data.length === 1)
    return (
      <SinglePeriodStats
        row={data[0]}
        xKey={xKey}
        series={lines}
        height={height}
        currency={currency}
      />
    );

  const showDots = data.length <= 12;
  const scale = niceScale(
    seriesValues(
      data,
      lines.map((l) => l.key),
    ),
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          domain={scale.domain}
          ticks={scale.ticks}
          tickFormatter={scale.format}
        />
        <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={LINE_CURSOR} />
        {lines.length > 1 && <Legend {...LEGEND_PROPS} />}
        {lines.map((l, i) => {
          const stroke = l.color ?? COLORS[i];
          return (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label ?? l.key}
              stroke={stroke}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              // A 2px ring in the surface colour keeps a marker legible where two
              // series cross or sit on top of one another.
              dot={showDots ? { r: 3, fill: stroke, stroke: SURFACE, strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: stroke, stroke: SURFACE, strokeWidth: 2 }}
              {...NO_MOUNT_ANIMATION}
            />
          );
        })}
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
  currency?: string;
}

export function StackedBarChart({
  data,
  xKey,
  keys,
  height = 300,
  currency = 'AED',
}: StackedBarProps) {
  const fmt = makeFmt(currency);
  if (isBlank((data ?? []).flatMap((row) => keys.map((k) => Number(row[k])))))
    return <Blank height={height} />;

  const scale = niceScale(stackTotals(data, keys));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          tickFormatter={(v) => prettyLabel(String(v))}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          domain={scale.domain}
          ticks={scale.ticks}
          tickFormatter={scale.format}
        />
        <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={BAR_CURSOR} />
        <Legend {...LEGEND_PROPS} />
        {keys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            stackId="a"
            fill={COLORS[i % COLORS.length]}
            maxBarSize={BAR_MAX}
            // The surface-coloured stroke is the 2px gap between stacked segments.
            stroke={SURFACE}
            strokeWidth={2}
            radius={i === keys.length - 1 ? [4, 4, 0, 0] : undefined}
            {...NO_MOUNT_ANIMATION}
          />
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
  currency?: string;
}

export function WaterfallChart({ data, height = 300, currency = 'AED' }: WaterfallProps) {
  const fmt = makeFmt(currency);
  if (!data?.length) return <Blank height={height} />;

  const scale = niceScale(data.flatMap((d) => [d.start, d.start + d.value]));

  const chartData = data.map((d) => ({
    name: prettyLabel(d.name.replace(/_/g, ' ')),
    invisible: d.start,
    visible: d.value,
    fill: d.fill,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 30 }}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey="name"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
          angle={-30}
          textAnchor="end"
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          domain={scale.domain}
          ticks={scale.ticks}
          tickFormatter={scale.format}
        />
        {/* The spacer bar is scaffolding, not a series, so it is kept out of the tooltip. */}
        <Tooltip
          content={<ChartTooltip fmt={fmt} hideKeys={['invisible']} />}
          cursor={BAR_CURSOR}
        />
        <Bar dataKey="invisible" stackId="a" fill="transparent" {...NO_MOUNT_ANIMATION} />
        <Bar
          dataKey="visible"
          name="Amount"
          stackId="a"
          maxBarSize={BAR_MAX}
          {...NO_MOUNT_ANIMATION}
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
                radius={[4, 4, 0, 0]}
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
  currency?: string;
}

export function AreaChart({ data, xKey, areas, height = 300, currency = 'AED' }: AreaProps) {
  const fmt = makeFmt(currency);
  if (isBlank((data ?? []).flatMap((row) => areas.map((a) => Number(row[a.key])))))
    return <Blank height={height} />;

  if (data.length === 1)
    return (
      <SinglePeriodStats
        row={data[0]}
        xKey={xKey}
        series={areas}
        height={height}
        currency={currency}
      />
    );

  const showDots = data.length <= 12;
  const scale = niceScale(
    seriesValues(
      data,
      areas.map((a) => a.key),
    ),
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_STROKE} vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_STROKE }}
        />
        <YAxis
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={52}
          domain={scale.domain}
          ticks={scale.ticks}
          tickFormatter={scale.format}
        />
        <Tooltip content={<ChartTooltip fmt={fmt} />} cursor={LINE_CURSOR} />
        {areas.length > 1 && <Legend {...LEGEND_PROPS} />}
        {areas.map((a, i) => {
          const stroke = a.color ?? COLORS[i];
          return (
            <Area
              key={a.key}
              type="monotone"
              dataKey={a.key}
              name={a.label ?? a.key}
              stroke={stroke}
              fill={stroke}
              // A wash, never a saturated block.
              fillOpacity={0.1}
              strokeWidth={2}
              strokeLinecap="round"
              dot={showDots ? { r: 3, fill: stroke, stroke: SURFACE, strokeWidth: 2 } : false}
              activeDot={{ r: 5, fill: stroke, stroke: SURFACE, strokeWidth: 2 }}
              {...NO_MOUNT_ANIMATION}
            />
          );
        })}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
