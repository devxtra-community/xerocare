import { RentType } from '../entities/enums/rentType';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { AppError } from '../errors/appError';

interface CalculationInput {
  rentType: RentType;
  monthlyRent: number;
  discountPercent: number;
  pricingItems: InvoiceItem[];
  /** Effective clicks charged per A3 page. Defaults to 2 (industry-standard
   *  A3 = 2x A4) when not set on the contract. */
  a3Multiplier?: number;
  /** Months of rent this invoice covers — 1 monthly, 3 quarterly, 6 half-yearly,
   *  12 yearly (see resolveBillingCycle). Scales both the base rent and the
   *  included page allowances, so a quarterly bill charges three months of rent
   *  against three months of free pages. Defaults to 1. */
  periodMonths?: number;
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
  calculate(rawInput: CalculationInput): CalculationResult {
    // Scale the per-month figures up to the length of the billing cycle before any
    // rule runs. Rent and included allowances both scale; per-click excess rates and
    // slab ranges are already per-page and must not.
    const periodMonths = Number(rawInput.periodMonths ?? 1) || 1;
    const input: CalculationInput =
      periodMonths === 1
        ? rawInput
        : {
            ...rawInput,
            monthlyRent: Number(rawInput.monthlyRent || 0) * periodMonths,
            pricingItems: (rawInput.pricingItems || []).map((rule) => {
              const scaled = { ...rule } as InvoiceItem;
              if (rule.bwIncludedLimit !== undefined && rule.bwIncludedLimit !== null)
                scaled.bwIncludedLimit = Number(rule.bwIncludedLimit) * periodMonths;
              if (rule.colorIncludedLimit !== undefined && rule.colorIncludedLimit !== null)
                scaled.colorIncludedLimit = Number(rule.colorIncludedLimit) * periodMonths;
              if (rule.combinedIncludedLimit !== undefined && rule.combinedIncludedLimit !== null)
                scaled.combinedIncludedLimit = Number(rule.combinedIncludedLimit) * periodMonths;
              return scaled;
            }),
          };

    const a3Multiplier = input.a3Multiplier ?? 2;
    const effectiveBw = input.usage.bwA4 + input.usage.bwA3 * a3Multiplier;
    const effectiveColor = input.usage.colorA4 + input.usage.colorA3 * a3Multiplier;
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
            excessAmount += this.calculateSlabAmount(excess, rule.bwSlabRanges);
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
            excessAmount += this.calculateSlabAmount(excess, rule.colorSlabRanges);
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
            excessAmount += this.calculateSlabAmount(excess, rule.comboSlabRanges);
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
        amount += this.calculateSlabAmount(effectiveBw, rule.bwSlabRanges);
      } else if (rule.bwExcessRate) {
        amount += effectiveBw * Number(rule.bwExcessRate);
      }

      // Colour slabs, falling back to a flat per-click rate exactly as B&W does above.
      // Without the fallback a CPC contract priced with a flat colour rate (rather than
      // slab ranges) billed every colour page at zero — silently, since the invoice still
      // rendered and simply omitted the colour revenue.
      if (rule.colorSlabRanges) {
        amount += this.calculateSlabAmount(effectiveColor, rule.colorSlabRanges);
      } else if (rule.colorExcessRate) {
        amount += effectiveColor * Number(rule.colorExcessRate);
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
      // Same flat-rate fallback as CPC above: a combo contract priced with a single
      // per-click rate instead of slab ranges must still bill, not silently total zero.
      if (rule.comboSlabRanges) {
        amount += this.calculateSlabAmount(effectiveTotal, rule.comboSlabRanges);
      } else if (rule.combinedExcessRate) {
        amount += effectiveTotal * Number(rule.combinedExcessRate);
      }
    }
    return amount;
  }

  /**
   * Prices `count` units across progressive tier brackets — each bracket only
   * covers its own range (0-10k @ tier1, 10k-20k @ tier2, ...), not a single
   * flat rate for the whole count. Volume beyond the top bracket's `to` bills
   * at the top bracket's rate rather than falling through to $0.
   */
  private calculateSlabAmount(
    count: number,
    slabs: Array<{ from: number; to: number; rate: number }>,
  ): number {
    if (count <= 0 || !slabs || slabs.length === 0) return 0;

    const sorted = [...slabs].sort((a, b) => a.from - b.from);
    let total = 0;
    let remaining = count;

    for (const slab of sorted) {
      if (remaining <= 0) break;
      const capacity = slab.to - slab.from + 1;
      const applicable = Math.min(remaining, capacity);
      total += applicable * Number(slab.rate);
      remaining -= applicable;
    }

    if (remaining > 0) {
      const topRate = Number(sorted[sorted.length - 1].rate);
      total += remaining * topRate;
    }

    return total;
  }
}
