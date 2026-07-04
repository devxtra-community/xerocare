export interface AssetCategoryMeta {
  label: string;
  icon: string;
  class: 'CURRENT' | 'NON_CURRENT';
  depreciable: boolean;
  defaultLife?: number | null;
  defaultRate?: number | null;
  salvagePct?: number;
  group: string;
}

export const ASSET_CATEGORIES: Record<string, AssetCategoryMeta> = {
  // ── CURRENT ASSETS ──────────────────────────────
  CASH_IN_HAND: {
    label: 'Cash in Hand',
    icon: '💵',
    class: 'CURRENT',
    depreciable: false,
    group: 'Cash & Equivalents',
  },
  CASH_AT_BANK: {
    label: 'Cash at Bank',
    icon: '🏦',
    class: 'CURRENT',
    depreciable: false,
    group: 'Cash & Equivalents',
  },
  ACCOUNTS_RECEIVABLE: {
    label: 'Accounts Receivable',
    icon: '📄',
    class: 'CURRENT',
    depreciable: false,
    group: 'Receivables',
  },
  PREPAID_EXPENSE: {
    label: 'Prepaid Expense',
    icon: '📋',
    class: 'CURRENT',
    depreciable: false,
    group: 'Prepaid & Deposits',
  },
  SECURITY_DEPOSIT_PAID: {
    label: 'Security Deposit Paid',
    icon: '🔐',
    class: 'CURRENT',
    depreciable: false,
    group: 'Prepaid & Deposits',
  },
  INVENTORY_STOCK: {
    label: 'Inventory / Stock',
    icon: '📦',
    class: 'CURRENT',
    depreciable: false,
    group: 'Inventory',
  },
  OTHER_CURRENT: {
    label: 'Other Current Asset',
    icon: '📌',
    class: 'CURRENT',
    depreciable: false,
    group: 'Other',
  },

  // ── NON-CURRENT — PROPERTY ───────────────────────
  LAND: {
    label: 'Land',
    icon: '🌍',
    class: 'NON_CURRENT',
    depreciable: false,
    defaultLife: null,
    defaultRate: null,
    group: 'Property',
  },
  BUILDING: {
    label: 'Building / Office',
    icon: '🏢',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 480,
    defaultRate: 2.5,
    salvagePct: 5,
    group: 'Property',
  },
  WAREHOUSE: {
    label: 'Warehouse',
    icon: '🏭',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 480,
    defaultRate: 2.5,
    salvagePct: 5,
    group: 'Property',
  },

  // ── NON-CURRENT — MACHINERY & EQUIPMENT ─────────
  PRINTER_EQUIPMENT: {
    label: 'Printer / Copier Equipment',
    icon: '🖨️',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 60,
    defaultRate: 20,
    salvagePct: 10,
    group: 'Machinery & Equipment',
  },
  MACHINERY: {
    label: 'Machinery',
    icon: '⚙️',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 120,
    defaultRate: 10,
    salvagePct: 10,
    group: 'Machinery & Equipment',
  },
  OFFICE_EQUIPMENT: {
    label: 'Office Equipment',
    icon: '🖥️',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 60,
    defaultRate: 20,
    salvagePct: 5,
    group: 'Machinery & Equipment',
  },
  COMPUTER_IT: {
    label: 'Computer / IT Equipment',
    icon: '💻',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 36,
    defaultRate: 33.33,
    salvagePct: 5,
    group: 'Machinery & Equipment',
  },
  AIR_CONDITIONER: {
    label: 'Air Conditioner',
    icon: '❄️',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 120,
    defaultRate: 10,
    salvagePct: 10,
    group: 'Machinery & Equipment',
  },
  GENERATOR: {
    label: 'Generator',
    icon: '⚡',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 120,
    defaultRate: 10,
    salvagePct: 10,
    group: 'Machinery & Equipment',
  },

  // ── NON-CURRENT — VEHICLES ───────────────────────
  VEHICLE_CAR: {
    label: 'Car / Sedan',
    icon: '🚗',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 60,
    defaultRate: 20,
    salvagePct: 15,
    group: 'Vehicles',
  },
  VEHICLE_VAN: {
    label: 'Van / Pickup',
    icon: '🚐',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 60,
    defaultRate: 20,
    salvagePct: 15,
    group: 'Vehicles',
  },
  VEHICLE_TRUCK: {
    label: 'Truck',
    icon: '🚛',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 84,
    defaultRate: 14.29,
    salvagePct: 10,
    group: 'Vehicles',
  },
  VEHICLE_MOTORCYCLE: {
    label: 'Motorcycle / Scooter',
    icon: '🏍️',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 48,
    defaultRate: 25,
    salvagePct: 10,
    group: 'Vehicles',
  },

  // ── NON-CURRENT — FURNITURE & FIXTURES ───────────
  FURNITURE: {
    label: 'Furniture',
    icon: '🪑',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 120,
    defaultRate: 10,
    salvagePct: 5,
    group: 'Furniture & Fixtures',
  },
  FIXTURE: {
    label: 'Fixtures & Fittings',
    icon: '🔧',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 120,
    defaultRate: 10,
    salvagePct: 5,
    group: 'Furniture & Fixtures',
  },
  SIGNAGE: {
    label: 'Signage / Display',
    icon: '🪧',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 60,
    defaultRate: 20,
    salvagePct: 0,
    group: 'Furniture & Fixtures',
  },

  // ── NON-CURRENT — INTANGIBLE ─────────────────────
  SOFTWARE_LICENSE: {
    label: 'Software License',
    icon: '💿',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 36,
    defaultRate: 33.33,
    salvagePct: 0,
    group: 'Intangible Assets',
  },
  PATENT_TRADEMARK: {
    label: 'Patent / Trademark',
    icon: '®️',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 120,
    defaultRate: 10,
    salvagePct: 0,
    group: 'Intangible Assets',
  },
  GOODWILL: {
    label: 'Goodwill',
    icon: '🤝',
    class: 'NON_CURRENT',
    depreciable: false,
    group: 'Intangible Assets',
  },

  // ── NON-CURRENT — INVESTMENTS ────────────────────
  LONG_TERM_INVESTMENT: {
    label: 'Long-term Investment',
    icon: '📈',
    class: 'NON_CURRENT',
    depreciable: false,
    group: 'Investments',
  },

  OTHER_NON_CURRENT: {
    label: 'Other Non-Current Asset',
    icon: '📌',
    class: 'NON_CURRENT',
    depreciable: true,
    defaultLife: 60,
    defaultRate: 20,
    salvagePct: 10,
    group: 'Other',
  },
};

export const CATEGORY_GROUPS = Object.entries(ASSET_CATEGORIES).reduce(
  (acc, [key, cat]) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push({ value: key, ...cat });
    return acc;
  },
  {} as Record<string, (AssetCategoryMeta & { value: string })[]>,
);
