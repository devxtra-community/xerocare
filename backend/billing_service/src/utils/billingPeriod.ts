import { RentPeriod } from '../entities/enums/rentPeriod';

/**
 * Billing-cycle geometry for a Rent/Lease contract.
 *
 * `billingCycleInDays` is only persisted for CUSTOM periods, so everything else
 * used to fall back to a hard-coded 30 days in the cron — which meant choosing
 * QUARTERLY / HALF_YEARLY / YEARLY changed the contract's end date but had no
 * effect whatsoever on how often it billed. Every contract invoiced monthly.
 *
 * `months` is the number of months of rent an invoice for one cycle represents.
 * The contract stores a *monthly* rent (the form field is literally "Monthly
 * Rent"), so a quarterly invoice bills three months of it — and, for the same
 * reason, carries three months' worth of included page allowance. Scaling the
 * rent without scaling the allowance would bill 3x the rent against 1x the free
 * pages and manufacture excess charges that the customer never incurred.
 */
export interface BillingCycle {
  days: number;
  months: number;
}

const CYCLES: Record<Exclude<RentPeriod, RentPeriod.CUSTOM>, BillingCycle> = {
  [RentPeriod.MONTHLY]: { days: 30, months: 1 },
  [RentPeriod.QUARTERLY]: { days: 90, months: 3 },
  [RentPeriod.HALF_YEARLY]: { days: 180, months: 6 },
  [RentPeriod.YEARLY]: { days: 365, months: 12 },
};

/**
 * Resolves the billing cycle for a contract. CUSTOM uses the stored day count and
 * prorates its rent against a 30-day month; anything unrecognised falls back to
 * monthly, preserving the previous behaviour rather than billing zero.
 */
export function resolveBillingCycle(
  rentPeriod?: RentPeriod | string | null,
  billingCycleInDays?: number | null,
): BillingCycle {
  if (rentPeriod === RentPeriod.CUSTOM) {
    const days = Number(billingCycleInDays) > 0 ? Number(billingCycleInDays) : 30;
    return { days, months: days / 30 };
  }

  const known = CYCLES[rentPeriod as Exclude<RentPeriod, RentPeriod.CUSTOM>];
  if (known) return known;

  // A stored billingCycleInDays with no recognised period still beats a blind 30.
  if (Number(billingCycleInDays) > 0) {
    const days = Number(billingCycleInDays);
    return { days, months: days / 30 };
  }

  return CYCLES[RentPeriod.MONTHLY];
}
