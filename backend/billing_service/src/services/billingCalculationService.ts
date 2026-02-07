import { RentType } from '../entities/enums/rentType';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { AppError } from '../errors/appError';

interface CalculationInput {
  rentType: RentType;
  monthlyRent: number;
  discountPercent: number;
  pricingItems: InvoiceItem[];
  usage: {
    bwA4: number;
    bwA3: number;
    colorA4: number;
    colorA3: number;
  };
}

interface CalculationResult {
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  effectiveBw: number;
  effectiveColor: number;
  totalUsage: number;
}

export class BillingCalculationService {
  calculate(input: CalculationInput): CalculationResult {
    // 1. Normalize Usage
    const effectiveBw = input.usage.bwA4 + input.usage.bwA3 * 2;
    const effectiveColor = input.usage.colorA4 + input.usage.colorA3 * 2;
    const totalUsage = effectiveBw + effectiveColor;

    let grossAmount = 0;

    // 2. Calculate Gross based on Rent Type
    switch (input.rentType) {
      case RentType.FIXED_LIMIT:
        grossAmount = this.calculateFixedLimit(
          input.monthlyRent,
          effectiveBw,
          effectiveColor,
          input.pricingItems,
        );
        break;
      case RentType.FIXED_COMBO:
        grossAmount = this.calculateFixedCombo(input.monthlyRent, totalUsage, input.pricingItems);
        break;
      case RentType.FIXED_FLAT:
        grossAmount = Number(input.monthlyRent);
        break;
      case RentType.CPC:
        grossAmount = this.calculateCPC(effectiveBw, effectiveColor, input.pricingItems);
        break;
      case RentType.CPC_COMBO:
        grossAmount = this.calculateCPCCombo(totalUsage, input.pricingItems);
        break;
      default:
        throw new AppError(`Unsupported Rent Type: ${input.rentType}`, 400);
    }

    // 3. Apply Discount
    const discountAmount = grossAmount * ((input.discountPercent || 0) / 100);
    const netAmount = Math.max(0, grossAmount - discountAmount);

    return {
      grossAmount,
      discountAmount,
      netAmount,
      effectiveBw,
      effectiveColor,
      totalUsage,
    };
  }

  private calculateFixedLimit(
    baseRent: number,
    bwUsage: number,
    colorUsage: number,
    rules: InvoiceItem[],
  ): number {
    let excessAmount = 0;
    // Assume one rule holds the limits/rates or aggregate them
    // Usually one pricing rule per Invoice for simplicity in Phase 1-3, or loop all
    // Based on user prompt "invoice_items represent pricing configuration".
    // We iterate but usually expect one definition set.
    for (const rule of rules) {
      if (rule.itemType !== 'PRICING_RULE') continue;

      if (rule.bwIncludedLimit !== undefined) {
        const excess = Math.max(0, bwUsage - rule.bwIncludedLimit);
        if (excess > 0) {
          if (rule.bwSlabRanges && rule.bwSlabRanges.length > 0) {
            const rate = this.findSlabRate(excess, rule.bwSlabRanges);
            excessAmount += excess * rate;
          } else if (rule.bwExcessRate !== undefined) {
            excessAmount += excess * Number(rule.bwExcessRate);
          }
        }
      }

      if (rule.colorIncludedLimit !== undefined) {
        const excess = Math.max(0, colorUsage - rule.colorIncludedLimit);
        if (excess > 0) {
          if (rule.colorSlabRanges && rule.colorSlabRanges.length > 0) {
            const rate = this.findSlabRate(excess, rule.colorSlabRanges);
            excessAmount += excess * rate;
          } else if (rule.colorExcessRate !== undefined) {
            excessAmount += excess * Number(rule.colorExcessRate);
          }
        }
      }
    }
    return Number(baseRent) + excessAmount;
  }

  private calculateFixedCombo(baseRent: number, totalUsage: number, rules: InvoiceItem[]): number {
    let excessAmount = 0;
    for (const rule of rules) {
      if (rule.itemType !== 'PRICING_RULE') continue;

      if (rule.combinedIncludedLimit !== undefined) {
        const excess = Math.max(0, totalUsage - rule.combinedIncludedLimit);
        if (excess > 0) {
          if (rule.comboSlabRanges && rule.comboSlabRanges.length > 0) {
            const rate = this.findSlabRate(excess, rule.comboSlabRanges);
            excessAmount += excess * rate;
          } else if (rule.combinedExcessRate !== undefined) {
            excessAmount += excess * Number(rule.combinedExcessRate);
          }
        }
      }
    }
    return Number(baseRent) + excessAmount;
  }

  private calculateCPC(bwUsage: number, colorUsage: number, rules: InvoiceItem[]): number {
    let amount = 0;
    // Rule: Slab rate applies to ENTIRE usage (Non-incremental)
    // Find the slab that matches the usage count.
    for (const rule of rules) {
      if (rule.itemType !== 'PRICING_RULE') continue;

      // B&W Slabs
      if (rule.bwSlabRanges) {
        const rate = this.findSlabRate(bwUsage, rule.bwSlabRanges);
        amount += bwUsage * rate;
      } else if (rule.bwExcessRate) {
        // Fallback if no slabs but flat rate?
        amount += bwUsage * Number(rule.bwExcessRate);
      }

      // Color Slabs
      if (rule.colorSlabRanges) {
        const rate = this.findSlabRate(colorUsage, rule.colorSlabRanges);
        amount += colorUsage * rate;
      }
    }
    return amount;
  }

  private calculateCPCCombo(totalUsage: number, rules: InvoiceItem[]): number {
    let amount = 0;
    for (const rule of rules) {
      if (rule.itemType !== 'PRICING_RULE') continue;

      if (rule.comboSlabRanges) {
        const rate = this.findSlabRate(totalUsage, rule.comboSlabRanges);
        amount += totalUsage * rate;
      }
    }
    return amount;
  }

  private findSlabRate(
    count: number,
    slabs: Array<{ from: number; to: number; rate: number }>,
  ): number {
    // Slabs: [{from: 0, to: 1000, rate: 0.5}, {from: 1001, to: 999999, rate: 0.4}]
    // Find range where count falls.
    const match = slabs.find((s) => count >= s.from && count <= s.to);
    return match ? Number(match.rate) : 0; // Or throw error/default highest? Assuming 0 if not found is risky.
    // Ideally user defined catch-all slab.
  }
}
