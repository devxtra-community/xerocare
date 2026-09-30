import { ServiceContractType } from '../entities/serviceContractEntity';

/**
 * Item-category-level coverage of a service contract.
 *
 * Business rules (confirmed 2026-07-13):
 * - AMC : labour + visits free; spare parts AND toner chargeable. Fixed monthly fee.
 * - SMA : labour + visits + spare parts free; toner chargeable. 1 year AND a copy
 *         limit (whichever first); copies beyond the limit billed at a per-copy rate.
 * - FSMA: everything free (incl. toner). Billed monthly per click (B&W/colour
 *         individually or a combined single rate).
 */
export interface ContractCoverage {
  labour: boolean;
  spareParts: boolean;
  toner: boolean;
  travel: boolean;
}

export const FULL_COVERAGE: ContractCoverage = {
  labour: true,
  spareParts: true,
  toner: true,
  travel: true,
};

export const NO_COVERAGE: ContractCoverage = {
  labour: false,
  spareParts: false,
  toner: false,
  travel: false,
};

/**
 * Warranty coverage (SALE warranty and lease-under-warranty) mirrors SMA:
 * labour + visits + spare parts free, toner always chargeable.
 * RENT machines remain fully covered (they are company-owned).
 */
export const WARRANTY_COVERAGE: ContractCoverage = {
  labour: true,
  spareParts: true,
  toner: false,
  travel: true,
};

/** Coverage is fixed per contract type — never trust client-provided rules. */
export const coverageForContractType = (type: ServiceContractType | string): ContractCoverage => {
  switch (type) {
    case ServiceContractType.AMC:
      return { labour: true, spareParts: false, toner: false, travel: true };
    case ServiceContractType.SMA:
      return { labour: true, spareParts: true, toner: false, travel: true };
    case ServiceContractType.FSMA:
      return { ...FULL_COVERAGE };
    default:
      return { ...NO_COVERAGE };
  }
};

/**
 * Normalizes stored coverage rules. Legacy rows used
 * `{ labour, consumables, travel }`; `consumables` splits into spareParts+toner.
 */
export const normalizeCoverage = (
  raw: Record<string, boolean> | null | undefined,
): ContractCoverage => {
  if (!raw) return { ...NO_COVERAGE };
  const consumables = raw.consumables ?? true;
  return {
    labour: raw.labour ?? true,
    spareParts: raw.spareParts ?? consumables,
    toner: raw.toner ?? consumables,
    travel: raw.travel ?? true,
  };
};

export const TONER_CATEGORY = 'TONER';

/** Catalog categories which are consumed or wear through normal machine use. */
const CONSUMABLE_CATEGORIES = new Set([
  'TONER',
  'CONSUMABLE',
  'INK',
  'DRUM',
  'FUSER',
  'TRANSFER_BELT',
  'PAPER_FEED_ROLLER',
  'ROLLER',
]);

/** Fallback for parts without an explicit category (e.g. CUSTOM ticket items). */
export const isConsumableName = (name?: string | null): boolean => {
  if (!name) return false;
  return /toner|cartridge|ink\b|developer|drum|fuser|transfer belt|paper feed roller/i.test(name);
};

/** Backward-compatible name for existing consumers. */
export const isTonerName = isConsumableName;

export const inferCatalogPartCategory = (partName?: string | null, description?: string | null) =>
  isConsumableName(`${partName || ''} ${description || ''}`) ? 'CONSUMABLE' : 'SPARE_PART';

export const isConsumableCategory = (category?: string | null): boolean =>
  !!category && CONSUMABLE_CATEGORIES.has(category.trim().toUpperCase());

/** Resolve the contract coverage for the ticket's server-resolved context. */
export const coverageForServiceContext = (
  serviceContext: string,
  contractCoverage?: ContractCoverage | null,
): ContractCoverage => {
  if (contractCoverage) return { ...contractCoverage };
  if (['RENT', 'LEASE_CPC', 'FSMA'].includes(serviceContext)) return { ...FULL_COVERAGE };
  if (['WARRANTY', 'LEASE_UNDER_WARRANTY', 'SMA'].includes(serviceContext)) {
    return { ...WARRANTY_COVERAGE };
  }
  if (serviceContext === 'AMC') {
    return { labour: true, spareParts: false, toner: false, travel: true };
  }
  return { ...NO_COVERAGE };
};

/** True when the given part/item category is paid for by the contract. */
export const coverageAllowsItem = (
  coverage: ContractCoverage,
  opts: { partCategory?: string | null; partName?: string | null },
): boolean => {
  const category = opts.partCategory?.trim().toUpperCase();
  // The catalog classification is authoritative when recognized. Names are only
  // a fallback for legacy rows and custom items without a catalog category.
  const consumable = category ? isConsumableCategory(category) : isConsumableName(opts.partName);
  return consumable ? coverage.toner : coverage.spareParts;
};
