import { Source } from '../config/dataSource';
import { AppError } from '../errors/appError';
import { CardProcessingFeeRule } from '../entities/cardProcessingFeeRuleEntity';
import { toMinor, fromMinor, percentOfMinor } from '../utils/money';
import { todayInBusinessTz } from '../utils/businessDate';

/**
 * Card processing fee (MDR) engine.
 *
 * The frontend shows a fee so the salesperson knows what the sale nets, but that number
 * is display only — this service recomputes it server-side from the merchant's own
 * configured agreement and the transaction is saved with what THIS returns. A client
 * that posts commissionRate: 0 changes nothing.
 */

export interface FeeContext {
  branchId?: string;
  issuerCountry: string;
  issuerBank?: string;
  cardType: string;
  cardNetwork?: string;
  paymentGateway?: string;
  transactionChannel?: string;
  currency: string;
  /** Gross amount the customer paid, in major units. */
  grossAmount: number;
  /** Defaults to today; pass the payment date so back-dated entries use the rate then in force. */
  onDate?: string;
}

export interface FeeResult {
  ruleId: string;
  ruleVersion: number;
  ratePercentApplied: number;
  fixedFeeApplied: number;
  commissionAmount: number;
  netSettlementAmount: number;
  currency: string;
  /** Set when a configured cap or floor changed the computed figure — shown in the drill-down. */
  cappedBy?: 'MINIMUM' | 'MAXIMUM';
}

/**
 * Most specific match wins.
 *
 * Score beats `priority` only as a tie-break: an explicit priority on a negotiated rule
 * is the merchant's own stated intent and must not be overridden by a rule that merely
 * names more columns.
 */
function specificity(rule: CardProcessingFeeRule): number {
  let score = 0;
  if (rule.branchId) score += 16;
  if (rule.issuerBank) score += 8;
  if (rule.cardNetwork) score += 4;
  if (rule.cardType) score += 2;
  if (rule.paymentGateway) score += 1;
  if (rule.transactionChannel) score += 1;
  return score;
}

export async function findApplicableRule(ctx: FeeContext): Promise<CardProcessingFeeRule | null> {
  const onDate = ctx.onDate || todayInBusinessTz();
  const country = ctx.issuerCountry.toUpperCase();
  const currency = ctx.currency.toUpperCase();

  const qb = Source.getRepository(CardProcessingFeeRule)
    .createQueryBuilder('r')
    .where('r."isActive" = true')
    .andWhere('r."issuerCountry" = :country', { country })
    .andWhere('r.currency = :currency', { currency })
    .andWhere('r."effectiveFrom" <= :onDate', { onDate })
    .andWhere('(r."effectiveTo" IS NULL OR r."effectiveTo" >= :onDate)', { onDate })
    // A null column on the rule is a wildcard; a set column must equal the transaction.
    .andWhere('(r."branchId" IS NULL OR r."branchId" = :branchId)', {
      branchId: ctx.branchId ?? null,
    })
    .andWhere('(r."issuerBank" IS NULL OR r."issuerBank" = :issuerBank)', {
      issuerBank: ctx.issuerBank ?? null,
    })
    .andWhere('(r."cardType" IS NULL OR r."cardType" = :cardType)', {
      cardType: ctx.cardType.toUpperCase(),
    })
    .andWhere('(r."cardNetwork" IS NULL OR r."cardNetwork" = :cardNetwork)', {
      cardNetwork: ctx.cardNetwork?.toUpperCase() ?? null,
    })
    .andWhere('(r."paymentGateway" IS NULL OR r."paymentGateway" = :gw)', {
      gw: ctx.paymentGateway ?? null,
    })
    .andWhere('(r."transactionChannel" IS NULL OR r."transactionChannel" = :ch)', {
      ch: ctx.transactionChannel ?? null,
    });

  const candidates = await qb.getMany();
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (specificity(b) !== specificity(a)) return specificity(b) - specificity(a);
    // Newest agreement last-resort tie-break, so a re-negotiated rule wins over the old.
    return new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime();
  });
  return candidates[0];
}

/**
 * Computes the fee for one transaction.
 *
 * Throws when no rule matches rather than defaulting to zero: silently charging 0% would
 * hand the merchant's own processing cost to nobody and the loss would never appear
 * anywhere. A genuinely fee-free arrangement is expressed as an explicit 0% rule.
 */
export async function calculateCardProcessingFee(ctx: FeeContext): Promise<FeeResult> {
  const rule = await findApplicableRule(ctx);
  if (!rule) {
    throw new AppError(
      `No card processing fee rule is configured for ${ctx.cardType} ${ctx.cardNetwork ?? ''} cards ` +
        `issued in ${ctx.issuerCountry} settling in ${ctx.currency}. ` +
        `Add the merchant's agreed rate under Accounts → Card Processing Fees before recording this payment.`,
      400,
    );
  }
  return applyRule(rule, ctx.grossAmount, ctx.currency);
}

/** The arithmetic, split out so tests and previews can exercise a rule directly. */
export function applyRule(
  rule: CardProcessingFeeRule,
  grossAmount: number,
  currency: string,
): FeeResult {
  const grossMinor = toMinor(grossAmount, currency);

  const percentMinor = percentOfMinor(grossMinor, Number(rule.ratePercent));
  const fixedMinor = toMinor(Number(rule.fixedFee || 0), currency);
  let feeMinor = percentMinor + fixedMinor;

  let cappedBy: FeeResult['cappedBy'];
  if (rule.minimumFee !== null && rule.minimumFee !== undefined) {
    const minMinor = toMinor(Number(rule.minimumFee), currency);
    if (feeMinor < minMinor) {
      feeMinor = minMinor;
      cappedBy = 'MINIMUM';
    }
  }
  if (rule.maximumFee !== null && rule.maximumFee !== undefined) {
    const maxMinor = toMinor(Number(rule.maximumFee), currency);
    if (feeMinor > maxMinor) {
      feeMinor = maxMinor;
      cappedBy = 'MAXIMUM';
    }
  }

  // A fee can never exceed the payment itself, nor be negative.
  if (feeMinor > grossMinor) feeMinor = grossMinor;
  if (feeMinor < 0) feeMinor = 0;

  return {
    ruleId: rule.id,
    ruleVersion: rule.version,
    ratePercentApplied: Number(rule.ratePercent),
    fixedFeeApplied: Number(rule.fixedFee || 0),
    commissionAmount: fromMinor(feeMinor, currency),
    // Derived by subtraction in minor units so gross − fee = net holds exactly.
    netSettlementAmount: fromMinor(grossMinor - feeMinor, currency),
    currency: currency.toUpperCase(),
    cappedBy,
  };
}
