type StatCardProps = {
  title: string;
  value: number | string;
};

export default function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 min-h-22.5">
      <p className="text-xs uppercase tracking-wide text-foreground">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold text-primary">
        {value}
      </p>
    </div>
  );
}
