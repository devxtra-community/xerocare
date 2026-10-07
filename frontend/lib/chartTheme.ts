/** Shared visual tokens for Recharts-based ERP analytics. */
export const ERP_CHART_COLORS = {
  primary: 'var(--chart-blue)',
  strong: 'var(--chart-blue-dark)',
  deep: 'var(--chart-indigo)',
  mid: 'var(--chart-blue-mid)',
  light: 'var(--chart-blue-soft)',
  soft: 'var(--chart-blue-light)',
  pale: 'var(--chart-blue-lighter)',
  grid: 'var(--chart-grid)',
  axis: 'var(--chart-axis)',
  muted: 'var(--chart-slate)',
  track: 'var(--soft-blue)',
  surface: 'var(--card)',
} as const;

export const ERP_CHART_SERIES = [
  ERP_CHART_COLORS.deep,
  ERP_CHART_COLORS.primary,
  ERP_CHART_COLORS.mid,
  ERP_CHART_COLORS.light,
  ERP_CHART_COLORS.soft,
  ERP_CHART_COLORS.pale,
] as const;
