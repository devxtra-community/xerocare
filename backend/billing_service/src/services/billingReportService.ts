import { InvoiceRepository } from '../repositories/invoiceRepository';
import { UsageRepository } from '../repositories/usageRepository';
import { InvoiceType } from '../entities/enums/invoiceType';
import { ContractStatus } from '../entities/enums/contractStatus';
import { AppError } from '../errors/appError';

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
      result[s.saleType] = s.count;
      result.SALE_TODAY += s.todayCount;
      result.SALE_THIS_MONTH += s.monthCount;
    });

    return result;
  }

  /**
   * Retrieves sales trend data for a branch.
   */
  async getBranchSales(period: string, branchId: string) {
    let days = 30;
    if (period === '1W') days = 7;
    else if (period === '1M') days = 30;
    else if (period === '3M') days = 90;
    else if (period === '1Y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.invoiceRepo.getBranchSalesTrend(branchId, startDate);
    return stats;
  }

  /**
   * Retrieves total sales figures for a branch.
   */
  async getBranchSalesTotals(branchId: string) {
    return await this.invoiceRepo.getBranchSalesTotals(branchId);
  }

  /**
   * Retrieves global sales trend data.
   */
  async getGlobalSales(period: string) {
    let days = 30;
    if (period === '1W') days = 7;
    else if (period === '1M') days = 30;
    else if (period === '3M') days = 90;
    else if (period === '1Y') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await this.invoiceRepo.getGlobalSalesTrend(startDate);
    return stats;
  }

  /**
   * Retrieves global sales total figures.
   */
  async getGlobalSalesTotals() {
    return await this.invoiceRepo.getGlobalSalesTotals();
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
      let finalAmount = 0;
      let grossAmount = 0;
      let advanceAdjusted = 0;

      if (summaryInvoice) {
        grossAmount = Number(summaryInvoice.grossAmount || 0);
        advanceAdjusted = Number(summaryInvoice.advanceAdjusted || 0);
        finalAmount = Number(summaryInvoice.totalAmount || 0);
        totalCollected = grossAmount;
      } else if (contract.type === InvoiceType.FINAL) {
        grossAmount = Number(contract.grossAmount || 0);
        advanceAdjusted = Number(contract.advanceAmount || 0);
        finalAmount = Number(contract.totalAmount || 0);
        totalCollected = grossAmount;
      } else {
        const monthlyInvoices = finalInvoices.filter(
          (inv) => !inv.isSummaryInvoice && inv.type === InvoiceType.FINAL,
        );

        const monthlySum = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount || 0),
          0,
        );
        const monthlyGross = monthlyInvoices.reduce(
          (sum, inv) => sum + Number(inv.grossAmount || inv.totalAmount || 0),
          0,
        );

        grossAmount = monthlyGross;
        advanceAdjusted = Number(contract.advanceAmount || 0);
        finalAmount = monthlySum;
        totalCollected = grossAmount;
      }

      if (grossAmount === 0) {
        try {
          const history = await this.usageRepo.getUsageHistory(contract.id, 'ASC');
          if (history.length > 0) {
            const usageGross = history.reduce((sum, u) => sum + Number(u.totalCharge || 0), 0);
            grossAmount = usageGross;
            totalCollected = usageGross;
            finalAmount = usageGross;
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
        finalAmount,
        totalAmount: finalAmount, // Add for compatibility with frontend
        grossAmount,
        advanceAdjusted,
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

  /**
   * Retrieves detailed financial report.
   */
  async getFinanceReport(filter: {
    branchId?: string;
    saleType?: string;
    month?: number;
    year?: number;
  }) {
    const reportData = await this.invoiceRepo.getFinanceReport(filter);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return reportData.map((item: any) => {
      const expense = 0;
      const profit = (item.income || 0) - expense;
      return {
        ...item,
        expense,
        profit,
        profitStatus: 'profit',
      };
    });
  }

  /**
   * Retrieves invoice history for a branch.
   */
  async getInvoiceHistory(branchId: string, saleType?: string) {
    const invoices = await this.invoiceRepo.findFinalInvoicesByBranch(branchId, saleType);

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

        return {
          ...invoice,
          usageData,
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
              doc.text(`    ${s.from} - ${s.to}: INR ${s.rate}`, 60, currentY);
              currentY += 12;
            });
            if (excessRate) {
              const maxTo = Math.max(...slabs.map((s) => Number(s.to) || 0));
              doc.text(`    > ${maxTo}: INR ${excessRate}`, 60, currentY);
              currentY += 12;
            }
          } else if (excessRate) {
            doc.text(`    Base Rate: INR ${excessRate}`, 60, currentY);
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
      doc.text(`INR ${Number(inv.totalAmount).toFixed(2)}`, amountX, y);
      y += 20;
    });

    doc.moveDown();
    doc.font('Helvetica-Bold');
    const totalCollected =
      summaryInvoice?.grossAmount ||
      monthlyInvoices.reduce((s, i) => s + Number(i.grossAmount || 0), 0);
    doc.text(`Total Collected: INR ${Number(totalCollected).toFixed(2)}`, amountX, y + 20);

    doc.end();
  }
}
