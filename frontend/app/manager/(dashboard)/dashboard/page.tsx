'use client';

import StatCard from '@/components/StatCard';
import { useState, useEffect } from 'react';
import { inventoryService } from '@/services/inventoryService';
import { branchService } from '@/services/branchService';
import { salesService } from '@/services/salesService';
import BranchSalesChart from '@/components/ManagerDashboardComponents/dashboardComponents/branchsalesChart';
import RevenuePieChart from '@/components/ManagerDashboardComponents/dashboardComponents/RevenuePieChart';
import SalaryDistributionChart from '@/components/ManagerDashboardComponents/dashboardComponents/SalaryDistributionChart';
import DashboardPage from '@/components/DashboardPage';
import { YearSelector } from '@/components/ui/YearSelector';
import { formatCurrency } from '@/lib/format';
import { getBranchInvoices, Invoice } from '@/lib/invoice';
import { CalendarRange, AlertTriangle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear());
  const [branchName, setBranchName] = useState('Branch');
  const [totalSales, setTotalSales] = useState(0);
  const [saleAmount, setSaleAmount] = useState(0);
  const [rentAmount, setRentAmount] = useState(0);
  const [leaseAmount, setLeaseAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expiringContracts, setExpiringContracts] = useState<Invoice[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [, branch, salesData, branchInvoices] = await Promise.all([
          inventoryService.getInventoryStats(),
          branchService.getMyBranch(),
          salesService.getBranchSalesTotals(selectedYear === 'all' ? undefined : selectedYear),
          getBranchInvoices(),
        ]);

        if (branch?.name) setBranchName(branch.name);

        // Set total sales
        setTotalSales(salesData.totalSales);

        // Set sales by type
        salesData.salesByType.forEach((item) => {
          if (item.saleType === 'SALE') setSaleAmount(item.total);
          else if (item.saleType === 'RENT') setRentAmount(item.total);
          else if (item.saleType === 'LEASE') setLeaseAmount(item.total);
        });

        // Filter expiring / expired contracts
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        const expiring = branchInvoices.filter((inv) => {
          if (!inv.effectiveTo) return false;
          const isContract = inv.status === 'ACTIVE_CONTRACT' || inv.status === 'EXPIRED';
          if (!isContract) return false;

          const toDate = new Date(inv.effectiveTo);
          return toDate <= thirtyDaysFromNow;
        });

        expiring.sort(
          (a, b) => new Date(a.effectiveTo!).getTime() - new Date(b.effectiveTo!).getTime(),
        );
        setExpiringContracts(expiring);
      } catch (error: unknown) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  return (
    <DashboardPage>
      <div className="flex flex-col space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              {branchName} Sales
            </h3>
            <p className="text-sm text-muted-foreground font-medium">
              Performance metrics and seasonal trends
            </p>
          </div>
          <YearSelector selectedYear={selectedYear} onYearChange={setSelectedYear} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <StatCard
            title="Total Revenue"
            value={loading ? '...' : formatCurrency(totalSales)}
            subtitle="All sales, rent, and lease"
          />
          <StatCard
            title="Product Sales"
            value={loading ? '...' : formatCurrency(saleAmount)}
            subtitle="Products and spare parts"
          />
          <StatCard
            title="Rent Revenue"
            value={loading ? '...' : formatCurrency(rentAmount)}
            subtitle="Rental income"
          />
          <StatCard
            title="Lease Revenue"
            value={loading ? '...' : formatCurrency(leaseAmount)}
            subtitle="Lease income"
          />
        </div>
      </div>

      {/* Expiring/Expired Contracts Section */}
      {expiringContracts.length > 0 && (
        <div className="rounded-[2rem] bg-white p-6 shadow-sm border border-slate-100 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                <CalendarRange className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Expiring & Expired Contracts</h4>
                <p className="text-xs text-slate-400 font-medium">
                  Contracts requiring renewal or action within 30 days
                </p>
              </div>
            </div>
            <span className="bg-red-50 text-red-700 font-bold px-3 py-1 rounded-full text-xs animate-pulse">
              {expiringContracts.length} Attention Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {expiringContracts.map((contract) => {
              const toDate = new Date(contract.effectiveTo!);
              const today = new Date();
              const isExpired = toDate < today;
              const diffTime = Math.abs(toDate.getTime() - today.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    {isExpired ? (
                      <div className="p-2 bg-red-100 text-red-600 rounded-full" title="Expired">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                    ) : (
                      <div
                        className="p-2 bg-amber-100 text-amber-600 rounded-full"
                        title="Expiring Soon"
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-slate-800 text-sm">
                        {contract.customerName || 'No Customer Assigned'}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">
                        Invoice No: {contract.invoiceNumber} | {contract.saleType}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xs font-black ${isExpired ? 'text-red-600' : 'text-amber-600'}`}
                    >
                      {isExpired ? `EXPIRED ${diffDays} days ago` : `Expires in ${diffDays} days`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">
                      {toDate.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Daily Sales Trends</h3>
          <BranchSalesChart
            period="1W"
            title="Weekly Overview"
            subtitle="Revenue by day"
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg sm:text-xl font-bold text-primary">Monthly Sales Trends</h3>
          <BranchSalesChart
            period="1Y"
            title="Yearly Overview"
            subtitle={`Revenue by month for ${selectedYear === 'all' ? 'all time' : selectedYear}`}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
        </div>
        <div className="space-y-2">
          <SalaryDistributionChart selectedYear={selectedYear} />
        </div>
        <div className="space-y-2">
          <RevenuePieChart selectedYear={selectedYear} />
        </div>
      </div>
    </DashboardPage>
  );
}
