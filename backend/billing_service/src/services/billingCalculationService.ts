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
    extraBwA4?: number;
    extraColorA4?: number;
  };
  additionalCharges?: number;
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
  /**
   * Calculates the billing amount based on rent type and usage.
   */
  calculate(input: CalculationInput): CalculationResult {
    const effectiveBw = input.usage.bwA4 + input.usage.bwA3 * 2;
    const effectiveColor = input.usage.colorA4 + input.usage.colorA3 * 2;
    const totalUsage = effectiveBw + effectiveColor;

    let grossAmount = 0;

    switch (input.rentType) {
      case RentType.FIXED_LIMIT:
        grossAmount = this.calculateFixedLimit(
          input,
          effectiveBw,
          effectiveColor,
          input.pricingItems,
        );
        break;
      case RentType.FIXED_COMBO:
        grossAmount = this.calculateFixedCombo(input, totalUsage, input.pricingItems);
        break;
      case RentType.FIXED_FLAT:
        grossAmount = Number(input.monthlyRent);
        break;
      case RentType.CPC:
        grossAmount = this.calculateCPC(input, effectiveBw, effectiveColor, input.pricingItems);
        break;
      case RentType.CPC_COMBO:
        grossAmount = this.calculateCPCCombo(input, totalUsage, input.pricingItems);
        break;
      default:
        throw new AppError(`Unsupported Rent Type: ${input.rentType}`, 400);
    }

    grossAmount += Number(input.additionalCharges || 0);

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

  /**
   * Calculates amount for FIXED_LIMIT rent type.
   */
  private calculateFixedLimit(
    input: CalculationInput,
    bwUsage: number,
    colorUsage: number,
    rules: InvoiceItem[],
  ): number {
    let excessAmount = 0;
    const baseRent = input.monthlyRent;

    for (const rule of rules) {
      if (rule.bwIncludedLimit !== undefined) {
        const excess = Math.max(0, bwUsage + (input.usage.extraBwA4 || 0) - rule.bwIncludedLimit);
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
        const excess = Math.max(
          0,
          colorUsage + (input.usage.extraColorA4 || 0) - rule.colorIncludedLimit,
        );
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

  /**
   * Calculates amount for FIXED_COMBO rent type.
   */
  private calculateFixedCombo(
    input: CalculationInput,
    totalUsage: number,
    rules: InvoiceItem[],
  ): number {
    let excessAmount = 0;
    const baseRent = input.monthlyRent;
    for (const rule of rules) {
      if (rule.combinedIncludedLimit !== undefined) {
        const excess = Math.max(
          0,
          totalUsage +
            (input.usage.extraBwA4 || 0) +
            (input.usage.extraColorA4 || 0) -
            rule.combinedIncludedLimit,
        );
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

  /**
   * Calculates amount for CPC (Cost Per Copy) rent type.
   */
  private calculateCPC(
    input: CalculationInput,
    bwUsage: number,
    colorUsage: number,
    rules: InvoiceItem[],
  ): number {
    let amount = 0;
    const effectiveBw = bwUsage + (input.usage.extraBwA4 || 0);
    const effectiveColor = colorUsage + (input.usage.extraColorA4 || 0);

    for (const rule of rules) {
      // B&W Slabs
      if (rule.bwSlabRanges) {
        const rate = this.findSlabRate(effectiveBw, rule.bwSlabRanges);
        amount += effectiveBw * rate;
      } else if (rule.bwExcessRate) {
        amount += effectiveBw * Number(rule.bwExcessRate);
      }

      // Color Slabs
      if (rule.colorSlabRanges) {
        const rate = this.findSlabRate(effectiveColor, rule.colorSlabRanges);
        amount += effectiveColor * rate;
      }
    }
    return amount;
  }

  /**
   * Calculates amount for CPC_COMBO rent type.
   */
  private calculateCPCCombo(
    input: CalculationInput,
    totalUsage: number,
    rules: InvoiceItem[],
  ): number {
    let amount = 0;
    const effectiveTotal =
      totalUsage + (input.usage.extraBwA4 || 0) + (input.usage.extraColorA4 || 0);
    for (const rule of rules) {
      if (rule.comboSlabRanges) {
        const rate = this.findSlabRate(effectiveTotal, rule.comboSlabRanges);
        amount += effectiveTotal * rate;
      }
    }
    return amount;
  }

  private findSlabRate(
    count: number,
    slabs: Array<{ from: number; to: number; rate: number }>,
  ): number {
    const match = slabs.find((s) => count >= s.from && count <= s.to);
    return match ? Number(match.rate) : 0;
  }
}
