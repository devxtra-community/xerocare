import { InvoiceRepository } from '../repositories/invoiceRepository';
import { UsageRepository } from '../repositories/usageRepository';
import { InvoiceType } from '../entities/enums/invoiceType';
import { ContractStatus } from '../entities/enums/contractStatus';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';

export class BillingReportService {
  private invoiceRepo = new InvoiceRepository();
  private usageRepo = new UsageRepository();

  /**
   * Calculates dashboard statistics (total sales, count, etc.).
   */
  async getInvoiceStats(filter: { createdBy?: string; branchId?: string } = {}) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = await this.invoiceRepo.getStats({ ...filter, startOfDay, startOfMonth });

    const result: Record<string, number> = {
      SALE: 0,
      RENT: 0,
      LEASE: 0,
      SALE_TODAY: 0,
      SALE_THIS_MONTH: 0,
    };

    stats.forEach((s) => {
      // Aggregate subtypes PRODUCT_SALE and SPAREPART_SALE into the SALE bucket
      if (
        s.saleType === 'PRODUCT_SALE' ||
        s.saleType === 'SPAREPART_SALE' ||
        s.saleType === 'SALE'
      ) {
        result.SALE += s.count;
        result.SALE_TODAY += s.todayCount;
        result.SALE_THIS_MONTH += s.monthCount;
      } else if (result[s.saleType] !== undefined) {
        result[s.saleType] = s.count;
      }
    });

    return result;
  }

  /**
   * Retrieves sales trend data for a branch.
   */
  async getBranchSales(period: string, branchId: string, year?: number) {
    let startDate: Date;
    let endDate: Date | undefined;

    if (year) {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    } else {
      let days = 30;
      if (period === '1W') days = 7;
      else if (period === '1M') days = 30;
      else if (period === '3M') days = 90;
      else if (period === '1Y') days = 365;

      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    const stats = await this.invoiceRepo.getBranchSalesTrend(branchId, startDate, endDate);
    return stats;
  }

  /**
   * Retrieves total sales figures for a branch.
   */
  async getBranchSalesTotals(branchId: string, year?: number) {
    return await this.invoiceRepo.getBranchSalesTotals(branchId, year);
  }

  /**
   * Retrieves comprehensive finance stats (Revenue, Expenses, Profit).
   */
  async getBranchFinanceStats(branchId: string, year?: number) {
    const [salesTotals, expenseData, payrollData] = await Promise.all([
      this.getBranchSalesTotals(branchId, year),
      this.getLotStatsFromInventory(branchId, year),
      this.getPayrollStatsFromEmployees(branchId, year),
    ]);

    const revenue = salesTotals.totalSales;
    const purchaseExpenses = expenseData.totalExpenses;
    const payrollExpenses = payrollData.totalSalaries;
    const totalExpenses = purchaseExpenses + payrollExpenses;
    const profit = revenue - totalExpenses;

    return {
      totalRevenue: revenue,
      totalExpenses: totalExpenses,
      purchaseExpenses: purchaseExpenses,
      totalSalaries: payrollExpenses,
      netProfit: profit,
      salesByType: salesTotals.salesByType,
    };
  }

  /**
   * Retrieves global sales trend data.
   */
  async getGlobalSales(period: string, year?: number) {
    let startDate: Date;
    let endDate: Date | undefined;

    if (year) {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    } else {
      let days = 30;
      if (period === '1W') days = 7;
      else if (period === '1M') days = 30;
      else if (period === '3M') days = 90;
      else if (period === '1Y') days = 365;

      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    const stats = await this.invoiceRepo.getGlobalSalesTrend(startDate, endDate);
    return stats;
  }

  /**
   * Retrieves global sales total figures.
   */
  async getGlobalSalesTotals(year?: number) {
    return await this.invoiceRepo.getGlobalSalesTotals(year);
  }

  /**
   * Retrieves admin-specific sales statistics.
   */
  async getAdminSalesStats() {
    return await this.invoiceRepo.getAdminSalesStats();
  }

  /**
   * Retrieves counts of pending actions for a branch.
   */
  async getPendingCounts(branchId: string) {
    const counts = await this.invoiceRepo.getPendingCounts(branchId);
    const result: Record<string, number> = {
      RENT: 0,
      LEASE: 0,
      SALE: 0,
    };
    counts.forEach((c) => {
      if (c.saleType) result[c.saleType] = c.count;
    });
    return result;
  }

  /**
   * Retrieves collection alerts for a branch.
   */
  async getCollectionAlerts(branchId: string) {
    const activeContracts = await this.invoiceRepo.findActiveContracts(branchId);
    const alerts: Array<{
      contractId: string;
      customerId: string;
      invoiceNumber: string;
      type: 'USAGE_PENDING' | 'INVOICE_PENDING' | 'SEND_PENDING' | 'SUMMARY_PENDING';
      saleType: string;
      dueDate: Date;
      effectiveFrom?: Date;
      effectiveTo?: Date;
      monthlyRent?: number;
      monthlyLeaseAmount?: number;
      monthlyEmiAmount?: number;
      totalAmount?: number;
      recordedMonths?: number;
      tenure?: number;
      contractStatus?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
      usageData?: {
        bwA4Count: number;
        bwA3Count: number;
        colorA4Count: number;
        colorA3Count: number;
        totalAmount?: number;
        billingPeriodStart: Date;
        billingPeriodEnd: Date;
      };
    }> = [];

    for (const contract of activeContracts) {
      if (!contract.effectiveFrom) continue;

      const history = await this.usageRepo.getUsageHistory(contract.id);

      if (contract.leaseTenureMonths && history.length >= contract.leaseTenureMonths) {
        alerts.push({
          contractId: contract.id,
          customerId: contract.customerId,
          invoiceNumber: contract.invoiceNumber,
          type: 'SUMMARY_PENDING',
          saleType: contract.saleType,
          dueDate: new Date(),
          effectiveFrom: contract.effectiveFrom,
          effectiveTo: contract.effectiveTo,
          monthlyRent: contract.monthlyRent,
          monthlyLeaseAmount: contract.monthlyLeaseAmount,
          monthlyEmiAmount: contract.monthlyEmiAmount,
          recordedMonths: history.length,
          tenure: contract.leaseTenureMonths || 0,
        });
        continue;
      }

      let currentPeriodStart: Date;

      const latestRecord = history[0];

      if (latestRecord) {
        currentPeriodStart = new Date(latestRecord.billingPeriodEnd);
        currentPeriodStart.setDate(currentPeriodStart.getDate() + 1);
      } else {
        currentPeriodStart = new Date(contract.effectiveFrom);
      }

      const cycleDays = contract.billingCycleInDays || 30;

      const currentPeriodEnd = new Date(currentPeriodStart);
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + cycleDays - 1);

      if (contract.effectiveTo && currentPeriodStart > contract.effectiveTo) {
        continue;
      }

      const due = new Date(currentPeriodEnd);
      due.setDate(due.getDate() + 5);

      alerts.push({
        contractId: contract.id,
        customerId: contract.customerId,
        invoiceNumber: contract.invoiceNumber,
        type: 'USAGE_PENDING',
        saleType: contract.saleType,
        dueDate: due,
        effectiveFrom: contract.effectiveFrom,
        effectiveTo: contract.effectiveTo,
        monthlyRent: contract.monthlyRent,
        monthlyLeaseAmount: contract.monthlyLeaseAmount,
        monthlyEmiAmount: contract.monthlyEmiAmount,
        recordedMonths: history.length,
        tenure: contract.leaseTenureMonths || 0,
        usageData: {
          bwA4Count: 0,
          bwA3Count: 0,
          colorA4Count: 0,
          colorA3Count: 0,
          billingPeriodStart: currentPeriodStart,
          billingPeriodEnd: currentPeriodEnd,
        },
      });
    }

    const finalInvoices = await this.invoiceRepo.findUnpaidFinalInvoices(branchId);
    for (const inv of finalInvoices) {
      alerts.push({
        contractId: inv.id,
        customerId: inv.customerId,
        invoiceNumber: inv.invoiceNumber,
        type: 'INVOICE_PENDING',
        saleType: inv.saleType,
        dueDate: inv.createdAt,
        effectiveFrom: inv.effectiveFrom,
        effectiveTo: inv.effectiveTo,
        monthlyRent: inv.monthlyRent,
        monthlyLeaseAmount: inv.monthlyLeaseAmount,
        monthlyEmiAmount: inv.monthlyEmiAmount,
        totalAmount: inv.totalAmount,
        contractStatus: 'COMPLETED',
        recordedMonths: inv.items?.length || 0,
        tenure: inv.leaseTenureMonths || 0,
      });
    }

    return alerts;
  }

  /**
   * Retrieves completed collections for a branch.
   */
  async getCompletedCollections(branchId?: string) {
    const completedContracts = await this.invoiceRepo.findCompletedContracts(branchId);

    const collections = [];

    for (const contract of completedContracts) {
      const customerDetails = await this.getCustomerDetails(contract.customerId);
      const finalInvoices = await this.invoiceRepo.findFinalInvoicesByContractId(contract.id);
      const summaryInvoice = finalInvoices.find((inv) => inv.isSummaryInvoice);

      let totalCollected = 0;
      let grossAmount = 0;
      let advanceAdjusted = 0;
      let discountAmount = 0;

      if (summaryInvoice) {
        grossAmount = Number(summaryInvoice.grossAmount || summaryInvoice.totalAmount || 0);
        advanceAdjusted = Number(summaryInvoice.advanceAdjusted || 0);
        discountAmount = Number(summaryInvoice.discountAmount || 0);
        totalCollected = grossAmount - discountAmount + Number(contract.advanceAmount || 0);
      } else if (contract.type === InvoiceType.FINAL) {
        grossAmount = Number(contract.grossAmount || contract.totalAmount || 0);
        advanceAdjusted = Number(contract.advanceAmount || 0);
        discountAmount = Number(contract.discountAmount || 0);
        totalCollected = grossAmount - discountAmount + Number(contract.advanceAmount || 0);
      } else {
        const monthlyInvoices = finalInvoices.filter(
          (inv) => !inv.isSummaryInvoice && inv.type === InvoiceType.FINAL,
        );

        const monthlyGross = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.grossAmount || inv.totalAmount || 0),
          0,
        );

        const monthlyDiscount = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.discountAmount || 0),
          0,
        );

        grossAmount = monthlyGross;
        advanceAdjusted = Number(contract.advanceAmount || 0);
        discountAmount = monthlyDiscount;
        totalCollected = grossAmount - discountAmount + Number(contract.advanceAmount || 0);
      }

      if (grossAmount === 0 || discountAmount === 0) {
        try {
          const history = await this.usageRepo.getUsageHistory(contract.id, 'ASC');
          if (history.length > 0) {
            const usageGross = history.reduce(
              (sum, u) => sum + (Number(u.monthlyRent || 0) + Number(u.exceededCharge || 0)),
              0,
            );
            const usageDiscount = history.reduce(
              (sum, u) => sum + Number(u.discountAmount || 0),
              0,
            );
            const usageAdvance = history.reduce(
              (sum, u) => sum + Number(u.advanceAdjusted || 0),
              0,
            );
            if (grossAmount === 0) {
              grossAmount = usageGross;
              totalCollected = usageGross - usageDiscount + Number(contract.advanceAmount || 0);
            }
            if (discountAmount === 0) {
              discountAmount = usageDiscount;
              // Recalculate if gross was already set but discount wasn't
              totalCollected = grossAmount - usageDiscount + Number(contract.advanceAmount || 0);
            }
            if (advanceAdjusted === 0) {
              advanceAdjusted = usageAdvance;
            }
          }
        } catch {
          // Ignore
        }
      }

      collections.push({
        contractId: contract.id,
        customerId: contract.customerId,
        invoiceNumber: contract.invoiceNumber,
        saleType: contract.saleType,
        effectiveFrom: contract.effectiveFrom,
        effectiveTo: contract.effectiveTo,
        completedAt: contract.completedAt,
        finalInvoiceId:
          summaryInvoice?.id || (contract.type === InvoiceType.FINAL ? contract.id : undefined),
        finalInvoiceNumber:
          summaryInvoice?.invoiceNumber ||
          (contract.type === InvoiceType.FINAL ? contract.invoiceNumber : undefined),
        totalCollected,
        finalAmount: totalCollected,
        totalAmount: totalCollected, // Ensure compatibility with all frontend views
        grossAmount,
        advanceAdjusted,
        discountAmount,
        securityDepositAmount: Number(contract.securityDepositAmount || 0),
        securityDepositMode: contract.securityDepositMode,
        securityDepositDate: contract.securityDepositDate,
        securityDepositBank: contract.securityDepositBank,
        securityDepositReference: contract.securityDepositReference,
        advanceAmount: Number(contract.advanceAmount || 0),
        status: summaryInvoice
          ? summaryInvoice.status
          : contract.status || ContractStatus.COMPLETED,
        customerName: customerDetails?.firstName
          ? `${customerDetails.firstName} ${customerDetails.lastName || ''}`.trim()
          : (contract as { customerName?: string }).customerName,
        customerPhone:
          customerDetails?.phone || (contract as { customerPhone?: string }).customerPhone,
        customerEmail:
          customerDetails?.email || (contract as { customerEmail?: string }).customerEmail,
      });
    }

    return collections;
  }

  private async getCustomerDetails(customerId: string) {
    try {
      const crmServiceUrl = process.env.CRM_SERVICE_URL || 'http://localhost:3005';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      const response = await fetch(`${crmServiceUrl}/customers/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      return null;
    }
  }

  private async getEmployeeDetails(employeeId: string) {
    try {
      const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      const response = await fetch(`${employeeServiceUrl}/employees/${employeeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      return null;
    }
  }

  private async getProductDetails(productId: string) {
    try {
      const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      const response = await fetch(`${inventoryServiceUrl}/products/${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      return null;
    }
  }

  private async getModelDetails(modelId: string) {
    try {
      const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      const response = await fetch(`${inventoryServiceUrl}/models/${modelId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      return null;
    }
  }

  private async getSparePartDetails(sparePartId: string) {
    try {
      const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN' },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      // Spare parts might not have a direct ID route yet, but usually they do or we can filter
      // For now, assume /spare-parts/:id exists based on pattern or I will add it
      const response = await fetch(`${inventoryServiceUrl}/spare-parts/${sparePartId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    } catch {
      return null;
    }
  }

  /**
   * Retrieves detailed financial report.
   */
  async getFinanceReport(filter: {
    branchId?: string;
    saleType?: string;
    month?: number;
    year?: number;
  }) {
    const [reportData, expenseStats, payrollStats] = await Promise.all([
      this.invoiceRepo.getFinanceReport(filter),
      this.getLotStatsFromInventory(
        filter.branchId === 'All' ? undefined : filter.branchId,
        filter.year,
      ),
      this.getPayrollStatsFromEmployees(
        filter.branchId === 'All' ? undefined : filter.branchId,
        filter.year,
      ),
    ]);

    const monthlyPurchaseExpenses = new Map<string, number>();
    if (expenseStats?.monthlyExpenses) {
      expenseStats.monthlyExpenses.forEach((e: { month: string; total: number }) => {
        monthlyPurchaseExpenses.set(e.month, (monthlyPurchaseExpenses.get(e.month) || 0) + e.total);
      });
    }

    const monthlySalaryExpenses = new Map<string, number>();
    if (payrollStats?.monthlySalaries) {
      payrollStats.monthlySalaries.forEach((e: { month: string; total: number }) => {
        monthlySalaryExpenses.set(e.month, (monthlySalaryExpenses.get(e.month) || 0) + e.total);
      });
    }

    // Build a map of invoice data keyed by month
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoiceByMonth = new Map<string, any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reportData.forEach((item: any) => {
      if (!invoiceByMonth.has(item.month)) {
        invoiceByMonth.set(item.month, { ...item });
      } else {
        // Aggregate income and count for same month (multiple saleTypes)
        const existing = invoiceByMonth.get(item.month);
        existing.income = (existing.income || 0) + (item.income || 0);
        existing.count = (existing.count || 0) + (item.count || 0);
        existing.source = 'All';
      }
    });

    // Collect all months from all three data sources
    const allMonths = new Set<string>([
      ...invoiceByMonth.keys(),
      ...monthlyPurchaseExpenses.keys(),
      ...monthlySalaryExpenses.keys(),
    ]);

    const branchId = filter.branchId && filter.branchId !== 'All' ? filter.branchId : undefined;

    // Build merged output for every month that has any data
    const merged = Array.from(allMonths).map((month) => {
      const invoiceData = invoiceByMonth.get(month);
      const purchaseExpense = monthlyPurchaseExpenses.get(month) || 0;
      const salaryExpense = monthlySalaryExpenses.get(month) || 0;
      const income = invoiceData?.income || 0;
      const expense = purchaseExpense + salaryExpense;
      const profit = income - expense;
      return {
        month,
        branchId: invoiceData?.branchId || branchId || null,
        source: invoiceData?.source || 'All',
        income,
        grossIncome: invoiceData?.grossIncome || 0,
        count: invoiceData?.count || 0,
        expense,
        purchaseExpense,
        salaryExpense,
        profit,
        profitStatus: profit >= 0 ? 'profit' : 'loss',
      };
    });

    // Sort by month descending (same as before)
    merged.sort((a, b) => b.month.localeCompare(a.month));
    return merged;
  }

  /**
   * Internal helper to fetch lot stats from the Inventory service.
   */
  private async getLotStatsFromInventory(branchId?: string, year?: number) {
    try {
      const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN', branchId: branchId || undefined },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      const url = year
        ? `${inventoryServiceUrl}/lots/stats/summary?year=${year}`
        : `${inventoryServiceUrl}/lots/stats/summary`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return { totalExpenses: 0, monthlyExpenses: [] };
      const data = await response.json();
      return data.data;
    } catch (err) {
      logger.error('Failed to fetch lot stats from inventory service', { error: err });
      return { totalExpenses: 0, monthlyExpenses: [] };
    }
  }

  /**
   * Internal helper to fetch payroll stats from the Employee service.
   */
  private async getPayrollStatsFromEmployees(branchId?: string, year?: number) {
    try {
      const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
      const { sign } = await import('jsonwebtoken');
      const token = sign(
        { userId: 'billing_service', role: 'ADMIN', branchId: branchId || undefined },
        process.env.ACCESS_SECRET as string,
        { expiresIn: '1m' },
      );

      const url = year
        ? `${employeeServiceUrl}/payroll/stats?year=${year}`
        : `${employeeServiceUrl}/payroll/stats`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return { totalSalaries: 0, monthlySalaries: [] };
      const data = await response.json();
      return data; // Employee service response is direct object
    } catch (err) {
      logger.error('Failed to fetch payroll stats from employee service', { error: err });
      return { totalSalaries: 0, monthlySalaries: [] };
    }
  }

  /**
   * Retrieves invoice history for a branch.
   */
  async getInvoiceHistory(branchId: string, saleType?: string, creatorId?: string) {
    const invoices = await this.invoiceRepo.findFinalInvoicesByBranch(
      branchId,
      saleType,
      creatorId,
    );

    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        let usageData = null;
        if (invoice.usageRecordId) {
          const usage = await this.usageRepo.findById(invoice.usageRecordId);
          if (usage) {
            usageData = {
              bwA4Count: usage.bwA4Count,
              bwA3Count: usage.bwA3Count,
              colorA4Count: usage.colorA4Count,
              colorA3Count: usage.colorA3Count,
              billingPeriodStart: usage.billingPeriodStart,
              billingPeriodEnd: usage.billingPeriodEnd,
              remarks: usage.remarks,
            };
          }
        }

        // Fetch all usage records for this contract to sum up accrued revenue and discounts
        const usageHistory = await this.usageRepo.getUsageHistory(invoice.id);
        const usageRevenue = usageHistory.reduce(
          (sum, u) => sum + (Number(u.monthlyRent || 0) + Number(u.exceededCharge || 0)),
          0,
        );
        const discountAmount = usageHistory.reduce(
          (sum, u) => sum + Number(u.discountAmount || 0),
          0,
        );

        return {
          ...invoice,
          usageData,
          usageRevenue,
          discountAmount: Number(invoice.discountAmount || 0) || discountAmount,
        };
      }),
    );

    return enrichedInvoices;
  }

  /**
   * Generates a PDF for the consolidated invoice and streams it to the response.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async downloadConsolidatedInvoice(contractId: string, res: any) {
    const { default: PDFDocument } = await import('pdfkit');

    const contract = await this.invoiceRepo.findById(contractId);
    if (!contract) throw new AppError('Contract not found', 404);

    const finalInvoices = await this.invoiceRepo.findFinalInvoicesByContractId(contractId);
    const summaryInvoice = finalInvoices.find((inv) => inv.isSummaryInvoice);
    const monthlyInvoices = finalInvoices
      .filter((inv) => !inv.isSummaryInvoice && inv.type === InvoiceType.FINAL)
      .reverse();

    const doc = new PDFDocument({ margin: 50 });

    doc.pipe(res);

    doc.fontSize(20).text('Consolidated Billing Statement', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).text(`Customer ID: ${contract.customerId}`);
    doc.text(`Contract #: ${contract.invoiceNumber}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    let currentY = doc.y;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pricingRules = (contract.items || []).filter((i: any) => i.itemType === 'PRICING_RULE');
    if (pricingRules.length > 0) {
      doc.font('Helvetica-Bold').fontSize(12).text('Pricing Details:', 50, currentY);
      currentY += 15;
      doc.font('Helvetica').fontSize(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pricingRules.forEach((rule: any) => {
        doc.text(`- ${rule.description}`, 50, currentY);
        currentY += 15;
        if (rule.bwIncludedLimit) {
          doc.text(`  B/W Included: ${rule.bwIncludedLimit}`, 50, currentY);
          currentY += 15;
        }
        if (rule.colorIncludedLimit) {
          doc.text(`  Color Included: ${rule.colorIncludedLimit}`, 50, currentY);
          currentY += 15;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderSlabsPdf = (slabs: any[], title: string, excessRate?: number) => {
          if ((!slabs || slabs.length === 0) && !excessRate) return;
          doc.font('Helvetica-Bold').text(`  ${title} Slabs:`, 60, currentY);
          currentY += 12;
          doc.font('Helvetica');
          if (slabs && slabs.length > 0) {
            slabs.forEach((s) => {
              doc.text(`    ${s.from} - ${s.to}: QAR ${s.rate}`, 60, currentY);
              currentY += 12;
            });
            if (excessRate) {
              const maxTo = Math.max(...slabs.map((s) => Number(s.to) || 0));
              doc.text(`    > ${maxTo}: QAR ${excessRate}`, 60, currentY);
              currentY += 12;
            }
          } else if (excessRate) {
            doc.text(`    Base Rate: QAR ${excessRate}`, 60, currentY);
            currentY += 12;
          }
        };

        renderSlabsPdf(rule.bwSlabRanges, 'Black & White', rule.bwExcessRate);
        renderSlabsPdf(rule.colorSlabRanges, 'Color', rule.colorExcessRate);
        renderSlabsPdf(rule.comboSlabRanges, 'Combined', rule.combinedExcessRate);
        currentY += 5;
      });
      currentY += 10;
    }

    const tableTop = Math.max(200, currentY + 10);
    const itemCodeX = 50;
    const descriptionX = 150;
    const amountX = 400;

    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('Period', itemCodeX, tableTop);
    doc.text('Invoice #', descriptionX, tableTop);
    doc.text('Amount', amountX, tableTop);
    doc.moveDown();
    doc.font('Helvetica').fontSize(12);

    let y = tableTop + 25;

    monthlyInvoices.forEach((inv) => {
      const start = inv.billingPeriodStart
        ? new Date(inv.billingPeriodStart).toLocaleDateString()
        : '-';
      const end = inv.billingPeriodEnd ? new Date(inv.billingPeriodEnd).toLocaleDateString() : '-';
      const period = `${start} to ${end}`;

      doc.text(period, itemCodeX, y);
      doc.text(inv.invoiceNumber, descriptionX, y);
      doc.text(`QAR ${Number(inv.totalAmount).toFixed(2)}`, amountX, y);
      y += 20;
    });

    doc.moveDown();
    doc.font('Helvetica-Bold');
    const grossVal =
      summaryInvoice?.grossAmount ||
      monthlyInvoices.reduce((s, i) => s + Number(i.grossAmount || 0), 0);
    const discVal =
      summaryInvoice?.discountAmount ||
      monthlyInvoices.reduce((s, i) => s + Number(i.discountAmount || 0), 0);
    const totalCollected = Number(grossVal) - Number(discVal);
    doc.text(`Total Due: QAR ${totalCollected.toFixed(2)}`, amountX, y + 20);

    doc.end();
  }

  /**
   * Generates a premium PDF for a quotation and streams it to the response.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async downloadPremiumQuotation(quotationId: string, res: any) {
    const { default: PDFDocument } = await import('pdfkit');

    const quotation = await this.invoiceRepo.findById(quotationId);
    if (!quotation) throw new AppError('Quotation not found', 404);

    const [customer, employee] = await Promise.all([
      this.getCustomerDetails(quotation.customerId),
      this.getEmployeeDetails(quotation.createdBy),
    ]);

    // Enrich items with product/spare part details
    const enrichedItems = await Promise.all(
      (quotation.items || []).map(async (item) => {
        let metadata = null;
        if (item.productId) {
          metadata = await this.getProductDetails(item.productId);
        } else if (item.description && !item.productId) {
          // Could be a spare part if not a pricing rule
          // In some cases, we might need a specific sparePartId in InvoiceItem
        }
        return { ...item, metadata };
      }),
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // --- Background/Header Banner ---
    doc.save();
    doc.fillColor('#f1f5f9').rect(0, 0, 595, 130).fill(); // Light slate background for header
    doc.fillColor('#dc2626').rect(0, 126, 595, 4).fill(); // Corporate Red bottom border

    // Mascot Placeholder (Styled Box)
    doc
      .fillColor('#ffffff')
      .roundedRect(40, 25, 80, 80, 10)
      .fill()
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .stroke();
    doc
      .fillColor('#dc2626')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('XC', 60, 50, { width: 40, align: 'center' });
    doc.fontSize(7).text('XEROCARE', 60, 62, { width: 40, align: 'center' });

    // Branding Text
    doc
      .fillColor('#dc2626')
      .font('Helvetica-Bold')
      .fontSize(36)
      .text('xerocare', 135, 35, { characterSpacing: -1 });
    doc
      .fillColor('#475569')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('TRADING & SERVICES W.L.L', 137, 72, { characterSpacing: 1.5 });

    doc.fillColor('#64748b').font('Helvetica').fontSize(9);
    doc.text('Fareej Al Manseer, Furousiya street, Doha-Qatar', 137, 90);
    doc.text('+974-70717282 | mail@xerocare.com | www.xerocare.com', 137, 104);

    // Right Side Metadata Boxes
    doc
      .fillColor('#b91c1c')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('ESTIMATE JOB REPORT', 375, 40, { align: 'right', width: 180 });

    // Date & No Boxes
    const boxWidth = 85;
    const boxHeight = 35;
    const boxY = 70;

    // Date Box
    doc
      .fillColor('#ffffff')
      .roundedRect(375, boxY, boxWidth, boxHeight, 6)
      .fill()
      .strokeColor('#fee2e2')
      .stroke();
    doc
      .fillColor('#64748b')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('DATE', 375, boxY + 5, { width: boxWidth, align: 'center' });
    doc
      .fillColor('#1e293b')
      .fontSize(10)
      .text(new Date(quotation.createdAt).toLocaleDateString(), 375, boxY + 16, {
        width: boxWidth,
        align: 'center',
      });

    // Estimate No Box
    doc
      .fillColor('#ffffff')
      .roundedRect(470, boxY, boxWidth, boxHeight, 6)
      .fill()
      .strokeColor('#dc2626')
      .lineWidth(1.5)
      .stroke();
    doc
      .fillColor('#dc2626')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('ESTIMATE NO.', 470, boxY + 5, { width: boxWidth, align: 'center' });
    doc
      .fillColor('#b91c1c')
      .fontSize(11)
      .text(quotation.invoiceNumber.split('-').pop() || '000', 470, boxY + 16, {
        width: boxWidth,
        align: 'center',
      });

    doc.restore();
    doc.moveDown(6);

    const startY = doc.y;

    // --- Customer Info ---
    // --- Customer & Rep Info ---
    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('CUSTOMER NAME / ADDRESS', 40, startY + 15);
    doc
      .fillColor('#1e293b')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(
        customer
          ? `${customer.firstName} ${customer.lastName || ''}`.toUpperCase()
          : 'WALKING CUSTOMER',
        40,
        startY + 28,
      );
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(8)
      .text(customer?.email || 'mail@customer.com', 40, startY + 41);
    doc.text(customer?.phone || '+974-0000-0000', 40, startY + 50);
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .text('DOHA, QATAR', 40, startY + 62);

    // Sales Rep & Payment (Boxes or styled text)
    const infoX = 350;
    doc
      .fillColor('#f8fafc')
      .roundedRect(infoX, startY + 15, 210, 50, 8)
      .fill()
      .strokeColor('#e2e8f0')
      .stroke();

    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(7)
      .text('PAYMENT METHOD', infoX + 15, startY + 25);
    doc
      .fillColor('#334155')
      .fontSize(9)
      .text('Due on receipt', infoX + 15, startY + 35);

    doc.fillColor('#94a3b8').text('SALES REP', infoX + 90, startY + 25);
    doc
      .fillColor('#334155')
      .fontSize(9)
      .text(
        employee ? `${employee.first_name[0]}${employee.last_name[0]}`.toUpperCase() : 'RSHD',
        infoX + 90,
        startY + 35,
      );

    doc.fillColor('#94a3b8').text('DUE DATE', infoX + 150, startY + 25);
    doc
      .fillColor('#334155')
      .fontSize(9)
      .text(new Date(quotation.createdAt).toLocaleDateString(), infoX + 150, startY + 35);

    doc.moveDown(4);

    // --- Product Metadata Line (Brand/Model/SL No) ---
    if (enrichedItems.length > 0 && enrichedItems[0].metadata) {
      const meta = enrichedItems[0].metadata;
      const metaY = doc.y;
      doc
        .fillColor('#f8fafc')
        .rect(40, metaY - 5, 520, 25)
        .fill();
      doc
        .fillColor('#dc2626')
        .rect(40, metaY - 5, 520, 1)
        .fill();
      doc
        .fillColor('#dc2626')
        .rect(40, metaY + 19, 520, 1)
        .fill();

      doc
        .fillColor('#94a3b8')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text('BRAND', 60, metaY + 5);
      doc
        .fillColor('#1e293b')
        .font('Helvetica-BoldOblique')
        .fontSize(10)
        .text((meta.brand || 'KYOCERA').toUpperCase(), 100, metaY + 4);

      doc.fillColor('#94a3b8').text('MODEL NO', 220, metaY + 5);
      doc
        .fillColor('#1e293b')
        .text((meta.model?.model_name || '4053').toUpperCase(), 280, metaY + 4);

      doc.fillColor('#94a3b8').text('SL NO', 420, metaY + 5);
      doc.fillColor('#1e293b').text((meta.serial_no || 'N/A').toUpperCase(), 460, metaY + 4);

      doc.moveDown(2);
    }

    // --- Table Header ---
    const tableTop = doc.y;
    const mpnX = 40;
    const descX = 100;
    const qtyX = 380;
    const rateX = 440;
    const totalX = 510;

    doc
      .fillColor('#b91c1c')
      .rect(40, tableTop - 5, 520, 25)
      .fill(); // Corporate Red Header
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    doc.text('MPN', mpnX + 5, tableTop);
    doc.text('DESCRIPTION', descX, tableTop);
    doc.text('QTY', qtyX, tableTop);
    doc.text('RATE', rateX, tableTop);
    doc.text('TOTAL', totalX, tableTop);

    let currentY = tableTop + 30;
    doc.font('Helvetica').fontSize(9);

    // --- Table Content ---
    for (const item of enrichedItems) {
      const itemHeight = 60;

      // Row Border
      doc
        .rect(40, currentY - 5, 520, itemHeight)
        .strokeColor('#fee2e2')
        .lineWidth(0.5)
        .stroke();
      doc.rect(40, currentY - 5, 55, itemHeight).stroke(); // MPN col border
      doc.rect(qtyX - 10, currentY - 5, 45, itemHeight).stroke(); // Qty col border
      doc.rect(rateX - 10, currentY - 5, 75, itemHeight).stroke(); // Rate col border

      const mpn = item.metadata?.mpn || ' ';
      const productName = (item.metadata?.name || item.description || 'ITEM').toUpperCase();
      const description =
        item.description && item.description !== productName
          ? item.description
          : 'Standard specification as per brand guidelines.';

      doc.fillColor('#475569').text(mpn, mpnX + 5, currentY + 5, { width: 50 });

      doc
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .text(productName, descX, currentY + 5);
      doc
        .fillColor('#64748b')
        .font('Helvetica')
        .fontSize(8)
        .text(description, descX, currentY + 18, { width: 270 });

      doc
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(String(item.quantity || 1), qtyX, currentY + 15, { width: 30, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(
          Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
          rateX,
          currentY + 15,
          { width: 60, align: 'right' },
        );

      const rowTotal = (item.quantity || 1) * (item.unitPrice || 0);
      doc
        .font('Helvetica-Bold')
        .text(
          rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          totalX,
          currentY + 15,
          { width: 50, align: 'right' },
        );

      currentY += itemHeight;

      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    }

    // --- Subtotal / Grand Total ---
    doc.moveDown(1);
    const totalsX = 350;
    const totalsWidth = 210;

    doc.fillColor('#dc2626').rect(totalsX, doc.y, totalsWidth, 35).fill();
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('TOTAL', totalsX + 20, doc.y + 10);
    doc
      .fontSize(16)
      .text(
        `QAR ${Number(quotation.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        totalsX,
        doc.y - 12,
        { width: totalsWidth - 20, align: 'right' },
      );

    doc.moveDown(4);

    // --- Terms & Conditions ---
    const termsY = doc.y;
    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('TERMS & CONDITIONS', 40, termsY);
    doc
      .fillColor('#94a3b8')
      .rect(40, termsY + 12, 100, 1)
      .fill();

    doc.fillColor('#64748b').font('Helvetica-Oblique').fontSize(8);
    const terms = [
      '• Delivery: 7-10 days normal working days after confirmed LPO',
      '• Payment: CASH or PDC (Management approved for the credit terms)',
      '• Warranty: 30 days in service of the parts, not covered the consumables.',
      '• Validity: 15 days estimated will valid. If not approved within 15 days will not be valid.',
    ];
    let ty = termsY + 20;
    terms.forEach((t) => {
      doc.text(t, 40, ty);
      ty += 12;
    });

    // Best Regards section
    const regardsX = 350;
    doc
      .fillColor('#1e293b')
      .font('Helvetica')
      .fontSize(9)
      .text(
        'We trust you will find our offer competitive and look forward to hearing from you at the earliest.',
        regardsX,
        termsY + 10,
        { width: 210 },
      );
    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('BEST REGARDS,', regardsX, termsY + 45);
    doc
      .fillColor('#b91c1c')
      .fontSize(10)
      .text('XEROCARE TRADING & SERVICES WLL', regardsX, termsY + 58);

    // --- Bottom Partner Brands ---
    const footerY = 740;
    doc.fillColor('#f8fafc').rect(0, footerY, 612, 100).fill();
    doc.fillColor('#e2e8f0').rect(0, footerY, 612, 1).fill();

    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(7)
      .text('PARTNERED WITH', 40, footerY + 15);
    const brands = ['Brother', 'Canon', 'Toshiba', 'Kyocera', 'Ricoh', 'Sharp'];
    let bx = 110;
    brands.forEach((b) => {
      doc
        .fillColor('#64748b')
        .font('Helvetica-BoldOblique')
        .text(b.toUpperCase(), bx, footerY + 15);
      bx += 50;
      doc.fillColor('#cbd5e1').text('|', bx - 10, footerY + 15);
    });

    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('© 2026 Xerocare Trading & Services WLL. All rights reserved.', 40, footerY + 45);

    doc.end();
  }

  /**
   * Generates a premium PDF for an invoice (Sale type) and streams it to the response.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async downloadPremiumInvoice(invoiceId: string, res: any) {
    const { default: PDFDocument } = await import('pdfkit');

    const invoice = await this.invoiceRepo.findById(invoiceId);
    if (!invoice) throw new AppError('Invoice not found', 404);

    const [customer, employee] = await Promise.all([
      this.getCustomerDetails(invoice.customerId),
      this.getEmployeeDetails(invoice.createdBy),
    ]);

    // Enrich items with product/spare part details
    const enrichedItems = await Promise.all(
      (invoice.items || []).map(async (item) => {
        let metadata = null;
        if (item.productId) {
          metadata = await this.getProductDetails(item.productId);
        }
        return { ...item, metadata };
      }),
    );

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // --- Background/Header Banner ---
    doc.save();
    doc.fillColor('#f1f5f9').rect(0, 0, 595, 130).fill(); // Light slate background for header
    doc.fillColor('#dc2626').rect(0, 126, 595, 4).fill(); // Corporate Red bottom border

    // Mascot Placeholder (Styled Box)
    doc
      .fillColor('#ffffff')
      .roundedRect(40, 25, 80, 80, 10)
      .fill()
      .strokeColor('#cbd5e1')
      .lineWidth(1)
      .stroke();
    doc
      .fillColor('#dc2626')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('XC', 60, 50, { width: 40, align: 'center' });
    doc.fontSize(7).text('XEROCARE', 60, 62, { width: 40, align: 'center' });

    // Branding Text
    doc
      .fillColor('#dc2626')
      .font('Helvetica-Bold')
      .fontSize(36)
      .text('xerocare', 135, 35, { characterSpacing: -1 });
    doc
      .fillColor('#475569')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('TRADING & SERVICES W.L.L', 137, 72, { characterSpacing: 1.5 });

    doc.fillColor('#64748b').font('Helvetica').fontSize(9);
    doc.text('Fareej Al Manseer, Furousiya street, Doha-Qatar', 137, 90);
    doc.text('+974-70717282 | mail@xerocare.com | www.xerocare.com', 137, 104);

    // Right Side Metadata Boxes
    doc
      .fillColor('#b91c1c')
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('INVOICE JOB REPORT', 375, 40, { align: 'right', width: 180 });

    // Date & No Boxes
    const boxWidth = 85;
    const boxHeight = 35;
    const boxY = 70;

    // Date Box
    doc
      .fillColor('#ffffff')
      .roundedRect(375, boxY, boxWidth, boxHeight, 6)
      .fill()
      .strokeColor('#fee2e2')
      .stroke();
    doc
      .fillColor('#64748b')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('DATE', 375, boxY + 5, { width: boxWidth, align: 'center' });
    doc
      .fillColor('#1e293b')
      .fontSize(10)
      .text(new Date(invoice.createdAt).toLocaleDateString(), 375, boxY + 16, {
        width: boxWidth,
        align: 'center',
      });

    // Invoice No Box
    doc
      .fillColor('#ffffff')
      .roundedRect(470, boxY, boxWidth, boxHeight, 6)
      .fill()
      .strokeColor('#dc2626')
      .lineWidth(1.5)
      .stroke();
    doc
      .fillColor('#dc2626')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('INVOICE NO.', 470, boxY + 5, { width: boxWidth, align: 'center' });
    doc
      .fillColor('#b91c1c')
      .fontSize(11)
      .text(invoice.invoiceNumber.split('-').pop() || '000', 470, boxY + 16, {
        width: boxWidth,
        align: 'center',
      });

    doc.restore();
    doc.moveDown(6);

    const startY = doc.y;

    // --- Customer Info ---
    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('CUSTOMER NAME / ADDRESS', 40, startY + 15);
    doc
      .fillColor('#1e293b')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(
        customer
          ? `${customer.firstName} ${customer.lastName || ''}`.toUpperCase()
          : 'WALKING CUSTOMER',
        40,
        startY + 28,
      );
    doc
      .fillColor('#64748b')
      .font('Helvetica')
      .fontSize(8)
      .text(customer?.email || 'mail@customer.com', 40, startY + 41);
    doc.text(customer?.phone || '+974-0000-0000', 40, startY + 50);
    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .text('DOHA, QATAR', 40, startY + 62);

    // Sales Rep & Payment
    const infoX = 350;
    doc
      .fillColor('#f8fafc')
      .roundedRect(infoX, startY + 15, 210, 50, 8)
      .fill()
      .strokeColor('#e2e8f0')
      .stroke();

    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(7)
      .text('PAYMENT METHOD', infoX + 15, startY + 25);
    doc
      .fillColor('#334155')
      .fontSize(9)
      .text('Due on receipt', infoX + 15, startY + 35);

    doc.fillColor('#94a3b8').text('SALES REP', infoX + 90, startY + 25);
    doc
      .fillColor('#334155')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(
        employee
          ? `${employee.firstName} ${employee.lastName || ''}`.toUpperCase()
          : 'SERVICE AGENT',
        infoX + 90,
        startY + 35,
      );

    // Brand / Model Box
    const modelY = startY + 80;
    doc.fillColor('#fef2f2').rect(40, modelY, 520, 25).fill();
    doc.fillColor('#dc2626').rect(40, modelY, 3, 25).fill();

    const allocation = invoice.productAllocations?.[0];
    const brandLabel = allocation?.modelId || 'N/A';
    const serialNo = allocation?.serialNumber || 'OFFICIAL PRODUCT';

    doc
      .fillColor('#991b1b')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('EQUIPMENT SPECIFICATION:', 50, modelY + 8);
    doc
      .fillColor('#1e293b')
      .text(
        `BRAND: ${brandLabel}   |   MODEL: PREMIUM SERIES   |   SL NO: ${serialNo}`,
        175,
        modelY + 8,
      );

    // --- Items Table ---
    let currentY = modelY + 40;
    const mpnX = 40;
    const descX = 105;
    const qtyX = 380;
    const rateX = 420;
    const totalX = 505;

    // Table Header
    doc.fillColor('#dc2626').rect(40, currentY, 520, 25).fill();
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    doc.text('MPN', mpnX + 5, currentY + 8);
    doc.text('ITEMS / DESCRIPTION', descX, currentY + 8);
    doc.text('QTY', qtyX, currentY + 8, { width: 30, align: 'center' });
    doc.text('RATE (QAR)', rateX, currentY + 8, { width: 75, align: 'right' });
    doc.text('TOTAL (QAR)', totalX, currentY + 8, { width: 50, align: 'right' });

    currentY += 30;

    for (const item of enrichedItems) {
      const itemHeight = 40;
      doc
        .rect(40, currentY - 5, 520, itemHeight)
        .strokeColor('#fee2e2')
        .lineWidth(0.5)
        .stroke();
      doc.rect(40, currentY - 5, 55, itemHeight).stroke();
      doc.rect(qtyX - 10, currentY - 5, 45, itemHeight).stroke();
      doc.rect(rateX - 10, currentY - 5, 75, itemHeight).stroke();

      const mpn = item.metadata?.mpn || ' ';
      const productName = (item.metadata?.name || item.description || 'ITEM').toUpperCase();
      const description = 'Official Xerocare verified equipment and services';

      doc
        .fillColor('#475569')
        .font('Helvetica')
        .fontSize(8)
        .text(mpn, mpnX + 5, currentY + 5, { width: 50 });
      doc
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(productName, descX, currentY + 5);
      doc
        .fillColor('#64748b')
        .font('Helvetica')
        .fontSize(7)
        .text(description, descX, currentY + 18, { width: 270 });

      doc
        .fillColor('#1e293b')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(String(item.quantity || 1), qtyX, currentY + 15, { width: 30, align: 'center' });
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(
          Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }),
          rateX,
          currentY + 15,
          { width: 60, align: 'right' },
        );

      const rowTotal = (item.quantity || 1) * (item.unitPrice || 0);
      doc
        .font('Helvetica-Bold')
        .text(
          rowTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }),
          totalX,
          currentY + 15,
          { width: 50, align: 'right' },
        );

      currentY += itemHeight;
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }
    }

    // --- Totals ---
    const totalsX_ = 350;
    const totalsWidth_ = 210;
    doc
      .fillColor('#dc2626')
      .rect(totalsX_, doc.y + 10, totalsWidth_, 35)
      .fill();
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('TOTAL', totalsX_ + 20, doc.y + 20);
    doc
      .fontSize(16)
      .text(
        `QAR ${Number(invoice.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
        totalsX_,
        doc.y - 12,
        { width: totalsWidth_ - 20, align: 'right' },
      );

    // --- Footer Brands ---
    const footerY_ = 740;
    doc.fillColor('#f8fafc').rect(0, footerY_, 612, 100).fill();
    doc.fillColor('#e2e8f0').rect(0, footerY_, 612, 1).fill();
    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(7)
      .text('PARTNERED WITH', 40, footerY_ + 15);
    const brands_ = ['Brother', 'Canon', 'Toshiba', 'Kyocera', 'Ricoh', 'Sharp'];
    let bx_ = 110;
    brands_.forEach((b) => {
      doc
        .fillColor('#64748b')
        .font('Helvetica-BoldOblique')
        .text(b.toUpperCase(), bx_, footerY_ + 15);
      bx_ += 50;
      doc.fillColor('#cbd5e1').text('|', bx_ - 10, footerY_ + 15);
    });
    doc
      .fillColor('#94a3b8')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('© 2026 Xerocare Trading & Services WLL. All rights reserved.', 40, footerY_ + 45);

    doc.end();
  }

  /**
   * Retrieves distinct years available for filtering.
   */
  async getAvailableYears() {
    return this.invoiceRepo.getAvailableYears();
  }
}
