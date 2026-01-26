import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ARDashboardPage() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Accounts Receivable</h1>
        <div className="flex gap-2">
          <Button variant="outline">Send Reminders</Button>
          <Button>Create Invoice</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard title="Total Receivables" value="₹12,45,000" />
        <SummaryCard title="Overdue Amount" value="₹3,20,000" variant="danger" />
        <SummaryCard title="Due This Week" value="₹1,80,000" />
        <SummaryCard title="Customers Over Limit" value="6" />
      </div>

      {/* Aging + Overdue Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ARAgingCard />
        <TopOverdueCustomers />
      </div>
    </div>
  );
}

/* ---------------- Components ---------------- */

function SummaryCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: string;
  variant?: 'danger';
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${variant === 'danger' ? 'text-red-600' : ''}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ARAgingCard() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>AR Aging Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AgingRow label="0–30 Days" amount="₹6,50,000" />
        <AgingRow label="31–60 Days" amount="₹3,10,000" />
        <AgingRow label="61–90 Days" amount="₹1,45,000" />
        <AgingRow label="90+ Days" amount="₹1,40,000" />
      </CardContent>
    </Card>
  );
}

function AgingRow({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-medium">{amount}</span>
    </div>
  );
}

function TopOverdueCustomers() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Overdue Customers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { name: 'ABC Enterprises', amount: '₹95,000', risk: 'High' },
          { name: 'Print Solutions Ltd', amount: '₹72,000', risk: 'Medium' },
          { name: 'XYZ Office Care', amount: '₹58,000', risk: 'High' },
        ].map((c) => (
          <div key={c.name} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">{c.amount}</p>
            </div>
            <Badge variant={c.risk === 'High' ? 'destructive' : 'secondary'}>{c.risk}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
