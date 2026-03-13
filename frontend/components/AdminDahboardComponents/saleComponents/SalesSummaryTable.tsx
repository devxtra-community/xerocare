'use client';

import { useState, useEffect, useMemo } from 'react';
import { getInvoices, Invoice, InvoiceItem } from '@/lib/invoice';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';

// Removed unused static data

interface SalesRow {
  productId: string;
  product: string;
  model: string;
  quantity: number;
  price: string;
  month: string;
  year: number;
}

/**
 * Table displaying detailed sales records aggregated from invoices.
 * Supports searching by product/ID and lists quantity, price (Sale/Rent/Lease), and date.
 * Provides a granular view of sales performance.
 */
const SalesSummaryTable = ({ selectedYear }: { selectedYear: number | 'all' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesRow[]>([]);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const invoices = await getInvoices();
        // Flatten items and map to table rows
        const sales = invoices
          .filter((inv: Invoice) => {
            const date = new Date(inv.createdAt);
            const matchesYear = selectedYear === 'all' || date.getFullYear() === selectedYear;
            return inv.items && inv.items.length > 0 && inv.saleType === 'SALE' && matchesYear;
          })
          .flatMap((inv: Invoice) =>
            (inv.items || []).map((item: InvoiceItem) => {
              const date = new Date(inv.createdAt);

              // Correct price logic based on sale type
              let displayPrice = formatCurrency(item.unitPrice || 0);
              if (inv.saleType === 'RENT') {
                displayPrice = `${formatCurrency(inv.monthlyRent || 0)}/Mo`;
              } else if (inv.saleType === 'LEASE') {
                displayPrice = `${formatCurrency(inv.monthlyEmiAmount || inv.monthlyLeaseAmount || 0)}/Mo`;
              }

              return {
                productId: item.id || inv.invoiceNumber,
                product: item.description,
                model: 'N/A',
                quantity: item.quantity || 1, // Default 1 for Rent/Lease contracts if qty 0
                price: displayPrice,
                month: date.toLocaleString('default', { month: 'long' }),
                year: date.getFullYear(),
              };
            }),
          );
        setSalesData(sales);
      } catch (error) {
        console.error('Failed to fetch sales summary:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [selectedYear]);

  const uniqueModels = useMemo(() => {
    const models = new Set<string>();
    salesData.forEach((row) => {
      if (row.model && row.model !== 'N/A') models.add(row.model);
      else if (row.product) models.add(row.product); // Fallback to product name if model is N/A
    });
    return Array.from(models).sort();
  }, [salesData]);

  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    salesData.forEach((row) => months.add(row.month));
    // Sort months chronologically
    const monthOrder = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return Array.from(months).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  }, [salesData]);

  const filteredData = useMemo(() => {
    return salesData.filter((row) => {
      const matchesSearch =
        row.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.productId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.model.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesModel =
        selectedModel === 'all' || row.model === selectedModel || row.product === selectedModel;
      const matchesMonth = selectedMonth === 'all' || row.month === selectedMonth;

      return matchesSearch && matchesModel && matchesMonth;
    });
  }, [salesData, searchTerm, selectedModel, selectedMonth]);

  return (
    <div className="rounded-2xl bg-card p-2 sm:p-3 shadow-sm w-full h-full flex flex-col space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search product, ID, or model..."
            className="pl-8 h-8 text-[11px] bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          {/* Model Filter */}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[120px] h-8 text-[11px] bg-background/50 border-muted-foreground/20">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <SelectValue placeholder="Model" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[11px]">
                All Models
              </SelectItem>
              {uniqueModels.map((m) => (
                <SelectItem key={m} value={m} className="text-[11px]">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Filter */}
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[120px] h-8 text-[11px] bg-background/50 border-muted-foreground/20">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <SelectValue placeholder="Month" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[11px]">
                All Months
              </SelectItem>
              {uniqueMonths.map((m) => (
                <SelectItem key={m} value={m} className="text-[11px]">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <span className="text-sm text-muted-foreground">Loading sales data...</span>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                  PRODUCT ID
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                  NAME
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                  MODEL
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                  QTY
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                  PRICE
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                  MONTH
                </th>
                <th className="text-left text-[10px] sm:text-xs font-semibold text-primary py-1.5 sm:py-2 px-1 sm:px-2">
                  YEAR
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={index} className={index % 2 === 1 ? 'bg-blue-50/20' : 'bg-card'}>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-foreground">
                      {row.productId}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs font-medium text-foreground">
                      {row.product}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                      {row.model}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                      {row.quantity}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                      {row.price}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                      {row.month}
                    </td>
                    <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-700">
                      {row.year}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    No sales records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SalesSummaryTable;
