import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { CustomerSelect } from '@/components/invoice/CustomerSelect';
import { CreateInvoicePayload, Invoice, InvoiceItem } from '@/lib/invoice';
import { ModelSelect } from '@/components/invoice/ModelSelect';
import { Model, getAllModels } from '@/lib/model';

// Helper to strip empty/zero fields for API
const cleanNumber = (val: string | number | undefined | null) =>
  val === '' || val === undefined || val === null ? undefined : Number(val);

const handleNumberInput = (val: string) => {
  // Allow empty string to clear the input
  if (val === '') return '';
  // Check if it's a valid number format (though input type="number" restricts this mostly)
  return val;
};

interface SlabRange {
  from: number;
  to: number;
  rate: number;
}

interface PricingItem {
  description: string;
  bwIncludedLimit?: string;
  colorIncludedLimit?: string;
  combinedIncludedLimit?: string;
  bwExcessRate?: string;
  colorExcessRate?: string;
  combinedExcessRate?: string;
  bwSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  colorSlabRanges?: Array<{ from: string; to: string; rate: string }>;
  comboSlabRanges?: Array<{ from: string; to: string; rate: string }>;
}

/**
 * Comprehensive modal for creating or editing rental/lease contracts.
 * Handles complex pricing logic, including tiered pricing (slabs) for black & white and color prints.
 * Supports different contract types (Rent/Lease) and durations.
 */
export default function RentFormModal({
  initialData,
  onClose,
  onConfirm,
  defaultSaleType = 'RENT',
  lockSaleType = false,
}: {
  initialData?: Invoice;
  onClose: () => void;
  onConfirm: (data: CreateInvoicePayload) => Promise<void> | void;
  defaultSaleType?: 'RENT' | 'LEASE';
  lockSaleType?: boolean;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize state. Use '' or undefined for numbers to avoid "0"
  const [form, setForm] = useState<{
    customerId: string;
    saleType: string;
    rentType: string;
    rentPeriod: string;
    billingCycleInDays: string; // New field for CUSTOM period
    monthlyRent: string;
    advanceAmount: string;
    discountPercent: string;
    effectiveFrom: string;
    effectiveTo: string;
    leaseType: 'EMI' | 'FSM';
    leaseTenureMonths: string;
    totalLeaseAmount: string;
    monthlyEmiAmount: string;
    monthlyLeaseAmount: string;
    pricingItems: PricingItem[];
  }>({
    customerId: initialData?.customerId || '',
    saleType: initialData?.saleType || defaultSaleType,
    rentType: initialData?.rentType || 'FIXED_LIMIT',
    rentPeriod: initialData?.rentPeriod || 'MONTHLY',
    billingCycleInDays:
      initialData?.billingCycleInDays !== undefined ? String(initialData.billingCycleInDays) : '',
    monthlyRent: initialData?.monthlyRent !== undefined ? String(initialData.monthlyRent) : '',
    advanceAmount:
      initialData?.advanceAmount !== undefined ? String(initialData.advanceAmount) : '',
    discountPercent:
      initialData?.discountPercent !== undefined ? String(initialData.discountPercent) : '',
    effectiveFrom: initialData?.effectiveFrom
      ? new Date(initialData.effectiveFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    effectiveTo: initialData?.effectiveTo
      ? new Date(initialData.effectiveTo).toISOString().split('T')[0]
      : '',
    leaseType: 'EMI' as 'EMI' | 'FSM',
    leaseTenureMonths:
      initialData?.leaseTenureMonths !== undefined ? String(initialData.leaseTenureMonths) : '',
    totalLeaseAmount:
      initialData?.totalLeaseAmount !== undefined ? String(initialData.totalLeaseAmount) : '',
    monthlyEmiAmount:
      initialData?.monthlyEmiAmount !== undefined ? String(initialData.monthlyEmiAmount) : '',
    monthlyLeaseAmount:
      initialData?.monthlyLeaseAmount !== undefined ? String(initialData.monthlyLeaseAmount) : '',
    pricingItems: (() => {
      if (!initialData) {
        // Default for NEW invoice
        return [
          { description: 'Black & White', bwIncludedLimit: '', bwExcessRate: '' },
          { description: 'Color', colorIncludedLimit: '', colorExcessRate: '' },
        ] as PricingItem[];
      }

      const extractedRules: PricingItem[] = [];
      initialData.items?.forEach((item) => {
        const isProduct =
          item.itemType === 'PRODUCT' || (!item.itemType && !item.description.includes(' - '));
        const baseDesc = item.description;

        if (isProduct) {
          // If product has limits, extract them as rules
          const hasBw =
            (item.bwIncludedLimit && Number(item.bwIncludedLimit) > 0) ||
            (item.bwExcessRate && Number(item.bwExcessRate) > 0) ||
            (item.bwSlabRanges && item.bwSlabRanges.length > 0);
          const hasColor =
            (item.colorIncludedLimit && Number(item.colorIncludedLimit) > 0) ||
            (item.colorExcessRate && Number(item.colorExcessRate) > 0) ||
            (item.colorSlabRanges && item.colorSlabRanges.length > 0);
          const hasCombined =
            (item.combinedIncludedLimit && Number(item.combinedIncludedLimit) > 0) ||
            (item.combinedExcessRate && Number(item.combinedExcessRate) > 0) ||
            (item.comboSlabRanges && item.comboSlabRanges.length > 0);

          if (hasBw) {
            extractedRules.push({
              description: `Black & White - ${baseDesc}`,
              bwIncludedLimit:
                item.bwIncludedLimit !== undefined ? String(item.bwIncludedLimit) : '',
              bwExcessRate: item.bwExcessRate !== undefined ? String(item.bwExcessRate) : '',
              bwSlabRanges:
                item.bwSlabRanges?.map((r) => ({
                  from: String(r.from),
                  to: String(r.to),
                  rate: String(r.rate),
                })) || [],
            });
          }
          if (hasColor) {
            extractedRules.push({
              description: `Color - ${baseDesc}`,
              colorIncludedLimit:
                item.colorIncludedLimit !== undefined ? String(item.colorIncludedLimit) : '',
              colorExcessRate:
                item.colorExcessRate !== undefined ? String(item.colorExcessRate) : '',
              colorSlabRanges:
                item.colorSlabRanges?.map((r) => ({
                  from: String(r.from),
                  to: String(r.to),
                  rate: String(r.rate),
                })) || [],
            });
          }
          if (hasCombined) {
            extractedRules.push({
              description: `Combined - ${baseDesc}`,
              combinedIncludedLimit:
                item.combinedIncludedLimit !== undefined ? String(item.combinedIncludedLimit) : '',
              combinedExcessRate:
                item.combinedExcessRate !== undefined ? String(item.combinedExcessRate) : '',
              comboSlabRanges:
                item.comboSlabRanges?.map((r) => ({
                  from: String(r.from),
                  to: String(r.to),
                  rate: String(r.rate),
                })) || [],
            });
          }
        } else {
          // It's already a PRICING_RULE or specifically formatted
          extractedRules.push({
            description: item.description,
            bwIncludedLimit: item.bwIncludedLimit !== undefined ? String(item.bwIncludedLimit) : '',
            colorIncludedLimit:
              item.colorIncludedLimit !== undefined ? String(item.colorIncludedLimit) : '',
            combinedIncludedLimit:
              item.combinedIncludedLimit !== undefined ? String(item.combinedIncludedLimit) : '',
            bwExcessRate: item.bwExcessRate !== undefined ? String(item.bwExcessRate) : '',
            colorExcessRate: item.colorExcessRate !== undefined ? String(item.colorExcessRate) : '',
            combinedExcessRate:
              item.combinedExcessRate !== undefined ? String(item.combinedExcessRate) : '',
            bwSlabRanges:
              item.bwSlabRanges?.map((r) => ({
                from: String(r.from),
                to: String(r.to),
                rate: String(r.rate),
              })) || [],
            colorSlabRanges:
              item.colorSlabRanges?.map((r) => ({
                from: String(r.from),
                to: String(r.to),
                rate: String(r.rate),
              })) || [],
            comboSlabRanges:
              item.comboSlabRanges?.map((r) => ({
                from: String(r.from),
                to: String(r.to),
                rate: String(r.rate),
              })) || [],
          });
        }
      });

      return extractedRules;
    })(),
  });

  // Effect to calculate Effective To date based on Tenure
  React.useEffect(() => {
    if (
      (form.saleType === 'LEASE' || form.saleType === 'RENT') &&
      form.leaseTenureMonths &&
      !isNaN(Number(form.leaseTenureMonths)) &&
      form.effectiveFrom
    ) {
      const tenureMonths = Number(form.leaseTenureMonths);
      if (tenureMonths > 0) {
        const startDate = new Date(form.effectiveFrom);
        // Calculate End Date: Start Date + Tenure Months - 1 Day
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + tenureMonths);
        endDate.setDate(endDate.getDate() - 1);

        const formattedEndDate = endDate.toISOString().split('T')[0];

        // Only update if different to avoid infinite loops
        if (form.effectiveTo !== formattedEndDate) {
          setForm((prev) => ({ ...prev, effectiveTo: formattedEndDate }));
        }
      }
    }
  }, [form.saleType, form.leaseTenureMonths, form.effectiveFrom, form.effectiveTo]);

  const [selectedModels, setSelectedModels] = useState<
    (Model & { quantity: number; id: string })[]
  >(() => {
    if (!initialData?.items) return [];
    const productItems = initialData.items.filter((i) => i.itemType === 'PRODUCT' || !!i.modelId);
    return productItems.map(
      (item) =>
        ({
          id: item.modelId || item.productId || 'unknown',
          model_name: item.description,
          model_no: '',
          description: '',
          quantity: item.quantity || 1,
          brandRelation: { id: '', name: '' },
        }) as Model & { quantity: number; id: string },
    );
  });

  // Hydrate models with full details from backend
  useEffect(() => {
    if (initialData?.items) {
      const fetchFullModels = async () => {
        try {
          const allModels = await getAllModels();
          // specific check inside async to satisfy TS
          if (!initialData?.items) return;

          const productItems = initialData.items.filter(
            (i) => i.itemType === 'PRODUCT' || !!i.modelId,
          );

          const hydrated = productItems.map((item) => {
            const found = allModels.find((m: Model) => m.id === item.modelId);
            if (found) {
              return { ...found, quantity: item.quantity || 1 };
            }
            return {
              id: item.modelId || 'unknown',
              model_name: item.description,
              model_no: '',
              description: '',
              quantity: item.quantity || 1,
              brandRelation: { id: '', name: '' },
            } as Model & { quantity: number; id: string };
          });

          setSelectedModels(hydrated);

          // Regenerate pricing rules based on hydrated models to ensure they appear
          const generatedRules: typeof form.pricingItems = [];

          // Helper to check if a rule exists in initialData (fuzzy match)
          const findInitialRule = (desc: string) => {
            // 1. Exact match
            const found = initialData?.items?.find((i) => i.description === desc);
            if (found) return found;

            // 2. Fallback: Check if the Source Product Item has the data (New Flow)
            // This is handled in the `addRule` function below, so we don't need fuzzy matching here anymore.
            // Fuzzy matching was the cause of the bug.
            return undefined;
          };

          const mapValues = (rule: PricingItem, source: InvoiceItem) => {
            // Map limits and rates - Convert to String for Form State
            if (source.bwIncludedLimit !== undefined && source.bwIncludedLimit !== null)
              rule.bwIncludedLimit = String(source.bwIncludedLimit);
            if (source.colorIncludedLimit !== undefined && source.colorIncludedLimit !== null)
              rule.colorIncludedLimit = String(source.colorIncludedLimit);
            if (source.combinedIncludedLimit !== undefined && source.combinedIncludedLimit !== null)
              rule.combinedIncludedLimit = String(source.combinedIncludedLimit);

            if (source.bwExcessRate !== undefined && source.bwExcessRate !== null)
              rule.bwExcessRate = String(source.bwExcessRate);
            if (source.colorExcessRate !== undefined && source.colorExcessRate !== null)
              rule.colorExcessRate = String(source.colorExcessRate);
            if (source.combinedExcessRate !== undefined && source.combinedExcessRate !== null)
              rule.combinedExcessRate = String(source.combinedExcessRate);

            // Map Slabs
            if (source.bwSlabRanges) {
              rule.bwSlabRanges = source.bwSlabRanges.map((r) => ({
                from: String(r.from),
                to: String(r.to),
                rate: String(r.rate),
              }));
            }
            if (source.colorSlabRanges) {
              rule.colorSlabRanges = source.colorSlabRanges.map((r) => ({
                from: String(r.from),
                to: String(r.to),
                rate: String(r.rate),
              }));
            }
            if (source.comboSlabRanges) {
              rule.comboSlabRanges = source.comboSlabRanges.map((r) => ({
                from: String(r.from),
                to: String(r.to),
                rate: String(r.rate),
              }));
            }

            return rule;
          };

          hydrated.forEach((m, index) => {
            const prefix = m.product_name || m.brandRelation?.name;
            const baseDesc = prefix ? `${prefix} ${m.model_name}` : m.model_name;
            const sourceItem = productItems[index];

            const addRule = (typeLabel: string, typeCode: 'BW' | 'COLOR' | 'COMBO') => {
              const desc = `${typeLabel} - ${baseDesc}`;
              // Try to find a separate rule first (Legacy)
              let initialRule = findInitialRule(desc);

              // If no separate rule found, check if the Source Product Item has the data (New Flow)
              if (!initialRule && sourceItem) {
                // Check if sourceItem has any relevant pricing fields populated
                const hasPricing =
                  sourceItem.bwIncludedLimit !== undefined ||
                  sourceItem.colorIncludedLimit !== undefined ||
                  sourceItem.combinedIncludedLimit !== undefined;
                if (hasPricing) {
                  initialRule = sourceItem;
                }
              }

              let newRule = {
                description: desc,
                ...(typeCode === 'COMBO'
                  ? { combinedIncludedLimit: '', combinedExcessRate: '' }
                  : {}),
                ...(typeCode === 'BW' ? { bwIncludedLimit: '', bwExcessRate: '' } : {}),
                ...(typeCode === 'COLOR' ? { colorIncludedLimit: '', colorExcessRate: '' } : {}),
              };

              if (initialRule) {
                newRule = mapValues(newRule, initialRule);
              }
              generatedRules.push(newRule);
            };

            if (form.rentType.includes('COMBO')) {
              addRule('Combined', 'COMBO');
            } else {
              addRule('Black & White', 'BW');
              if (m.print_colour !== 'BLACK_WHITE') {
                addRule('Color', 'COLOR');
              }
            }
          });

          if (generatedRules.length > 0) {
            setForm((prev) => ({ ...prev, pricingItems: generatedRules }));
          }
        } catch (error) {
          console.error('Failed to hydrate models', error);
        }
      };
      fetchFullModels();
    }
  }, [initialData, form]);

  const updateUsageRules = (
    models: (Model & { quantity: number })[],
    overrideRentType?: string,
  ) => {
    const currentRentType = overrideRentType || form.rentType;
    const isCombo = currentRentType.includes('COMBO');

    let newItems: typeof form.pricingItems = [];

    models.forEach((m) => {
      // Assume models support both for now, or fetch capability
      // For MVP, enable consistent rules based on Model Name
      const prefix = m.product_name || m.brandRelation?.name;
      const baseDesc = prefix ? `${prefix} ${m.model_name}` : m.model_name;

      // ... (rule generation logic using baseDesc)
      // Replicating existing logic but using model properties
      const createItem = (prefix: string, type: 'BW' | 'COLOR' | 'COMBO') => {
        const desc = `${prefix} - ${baseDesc}`;
        const existing = form.pricingItems.find((i) => i.description === desc);
        if (existing) return existing;

        return {
          description: desc,
          ...(type === 'COMBO' ? { combinedIncludedLimit: '', combinedExcessRate: '' } : {}),
          ...(type === 'BW' ? { bwIncludedLimit: '', bwExcessRate: '' } : {}),
          ...(type === 'COLOR' ? { colorIncludedLimit: '', colorExcessRate: '' } : {}),
        };
      };

      // Default to BOTH for now
      if (isCombo) {
        newItems.push(createItem('Combined', 'COMBO'));
      } else {
        newItems.push(createItem('Black & White', 'BW'));
        // Only add Color if not strictly Black & White
        if (m.print_colour !== 'BLACK_WHITE') {
          newItems.push(createItem('Color', 'COLOR'));
        }
      }
    });

    if (models.length === 0) newItems = [];

    setForm((prev) => ({
      ...prev,
      pricingItems: newItems,
      ...(overrideRentType ? { rentType: overrideRentType } : {}),
    }));
  };

  const handleModelAdd = (model: Model) => {
    if (selectedModels.find((m) => m.id === model.id)) return;
    const newModels = [...selectedModels, { ...model, quantity: 1 }];
    setSelectedModels(newModels);
    updateUsageRules(newModels);
  };

  const handleModelRemove = (id: string) => {
    const newModels = selectedModels.filter((m) => m.id !== id);
    setSelectedModels(newModels);
    updateUsageRules(newModels);
  };

  const handleQuantityChange = (id: string, qty: number) => {
    const newModels = selectedModels.map((m) => (m.id === id ? { ...m, quantity: qty } : m));
    setSelectedModels(newModels);
    // Rules don't change based on quantity
  };

  const handleConfirm = async () => {
    if (!form.customerId) {
      toast.error('Please select a customer.');
      return;
    }
    if (!form.effectiveFrom) {
      toast.error('Please select effective start date.');
      return;
    }
    if (form.rentPeriod === 'CUSTOM' && !form.billingCycleInDays) {
      toast.error('Please enter the Billing Cycle in days for Custom period.');
      return;
    }

    setIsSubmitting(true);
    try {
      let cleanPayload: CreateInvoicePayload;

      if (form.saleType === 'LEASE') {
        cleanPayload = {
          customerId: form.customerId,
          saleType: 'LEASE',
          leaseType: form.leaseType,
          leaseTenureMonths: cleanNumber(form.leaseTenureMonths),

          // EMI Fields
          totalLeaseAmount:
            form.leaseType === 'EMI' ? cleanNumber(form.totalLeaseAmount) : undefined,
          monthlyEmiAmount:
            form.leaseType === 'EMI' ? cleanNumber(form.monthlyEmiAmount) : undefined,

          // FSM Fields
          monthlyLeaseAmount:
            form.leaseType === 'FSM' ? cleanNumber(form.monthlyLeaseAmount) : undefined,

          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
          discountPercent: cleanNumber(form.discountPercent),
          advanceAmount: cleanNumber(form.advanceAmount),

          items: selectedModels.flatMap((m) => {
            const prefix = m.product_name || m.brandRelation?.name;
            const baseDesc = prefix ? `${prefix} ${m.model_name}` : m.model_name;

            // STRICT MATCHING LOGIC
            // Ensure we look for the exact description keys we generated in `updateUsageRules`
            const possibleDescriptions = [
              `Black & White - ${baseDesc}`,
              `Color - ${baseDesc}`,
              `Combined - ${baseDesc}`,
            ];

            const myRules = form.pricingItems.filter((i) =>
              possibleDescriptions.includes(i.description.trim()),
            );

            const quantity = m.quantity || 1;

            // Create an array of size 'quantity', each element representing 1 unit
            return Array.from({ length: quantity }).map(() => {
              const mergedItem: InvoiceItem & {
                bwIncludedLimit?: number;
                colorIncludedLimit?: number;
                combinedIncludedLimit?: number;
                bwExcessRate?: number;
                colorExcessRate?: number;
                combinedExcessRate?: number;
                bwSlabRanges?: SlabRange[];
                colorSlabRanges?: SlabRange[];
                comboSlabRanges?: SlabRange[];
              } = {
                description: baseDesc,
                quantity: 1, // Force 1 per item for serial allocation
                unitPrice: 0,
                itemType: 'PRODUCT' as const,
                modelId: m.id,
                // productId is NOT set here, as it is allocated later
              };

              myRules.forEach((rule) => {
                const bwLimit = cleanNumber(rule.bwIncludedLimit);
                if (bwLimit !== undefined) mergedItem.bwIncludedLimit = bwLimit;

                const colorLimit = cleanNumber(rule.colorIncludedLimit);
                if (colorLimit !== undefined) mergedItem.colorIncludedLimit = colorLimit;

                const combinedLimit = cleanNumber(rule.combinedIncludedLimit);
                if (combinedLimit !== undefined) mergedItem.combinedIncludedLimit = combinedLimit;

                const bwRate = cleanNumber(rule.bwExcessRate);
                if (bwRate !== undefined) mergedItem.bwExcessRate = bwRate;

                const colorRate = cleanNumber(rule.colorExcessRate);
                if (colorRate !== undefined) mergedItem.colorExcessRate = colorRate;

                const combinedRate = cleanNumber(rule.combinedExcessRate);
                if (combinedRate !== undefined) mergedItem.combinedExcessRate = combinedRate;

                if (rule.bwSlabRanges?.length) {
                  mergedItem.bwSlabRanges = rule.bwSlabRanges.map((r) => ({
                    from: Number(r.from),
                    to: Number(r.to),
                    rate: Number(r.rate),
                  }));
                }
                if (rule.colorSlabRanges?.length) {
                  mergedItem.colorSlabRanges = rule.colorSlabRanges.map((r) => ({
                    from: Number(r.from),
                    to: Number(r.to),
                    rate: Number(r.rate),
                  }));
                }
                if (rule.comboSlabRanges?.length) {
                  mergedItem.comboSlabRanges = rule.comboSlabRanges.map((r) => ({
                    from: Number(r.from),
                    to: Number(r.to),
                    rate: Number(r.rate),
                  }));
                }
              });

              return mergedItem as unknown as NonNullable<CreateInvoicePayload['items']>[number];
            });
          }),
          pricingItems: [],
        };
      } else {
        const isFixed = form.rentType.startsWith('FIXED');

        cleanPayload = {
          customerId: form.customerId,
          saleType: 'RENT',
          rentType: form.rentType as
            | 'FIXED_LIMIT'
            | 'FIXED_COMBO'
            | 'FIXED_FLAT'
            | 'CPC'
            | 'CPC_COMBO',
          rentPeriod: form.rentPeriod as
            | 'MONTHLY'
            | 'QUARTERLY'
            | 'HALF_YEARLY'
            | 'YEARLY'
            | 'CUSTOM',
          billingCycleInDays:
            form.rentPeriod === 'CUSTOM' ? cleanNumber(form.billingCycleInDays) : undefined,
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
          monthlyRent: isFixed ? cleanNumber(form.monthlyRent) : undefined,
          advanceAmount: isFixed ? cleanNumber(form.advanceAmount) : undefined,
          discountPercent: cleanNumber(form.discountPercent),
          items: selectedModels.flatMap((m) => {
            const prefix = m.product_name || m.brandRelation?.name;
            const baseDesc = prefix ? `${prefix} ${m.model_name}` : m.model_name;

            const possibleDescriptions = [
              `Black & White - ${baseDesc}`,
              `Color - ${baseDesc}`,
              `Combined - ${baseDesc}`,
            ];
            const myRules = form.pricingItems.filter((i) =>
              possibleDescriptions.includes(i.description.trim()),
            );
            const quantity = m.quantity || 1;

            return Array.from({ length: quantity }).map(() => {
              const mergedItem: InvoiceItem = {
                description: baseDesc,
                quantity: 1, // Force 1 per item
                unitPrice: 0,
                itemType: 'PRODUCT' as const,
                modelId: m.id,
              };

              myRules.forEach((rule) => {
                const bwLimit = cleanNumber(rule.bwIncludedLimit);
                if (bwLimit !== undefined) mergedItem.bwIncludedLimit = bwLimit;

                const colorLimit = cleanNumber(rule.colorIncludedLimit);
                if (colorLimit !== undefined) mergedItem.colorIncludedLimit = colorLimit;

                const combinedLimit = cleanNumber(rule.combinedIncludedLimit);
                if (combinedLimit !== undefined) mergedItem.combinedIncludedLimit = combinedLimit;

                const bwRate = cleanNumber(rule.bwExcessRate);
                if (bwRate !== undefined) mergedItem.bwExcessRate = bwRate;

                const colorRate = cleanNumber(rule.colorExcessRate);
                if (colorRate !== undefined) mergedItem.colorExcessRate = colorRate;

                const combinedRate = cleanNumber(rule.combinedExcessRate);
                if (combinedRate !== undefined) mergedItem.combinedExcessRate = combinedRate;

                if (rule.bwSlabRanges?.length) {
                  mergedItem.bwSlabRanges = rule.bwSlabRanges.map((r) => ({
                    from: Number(r.from),
                    to: Number(r.to),
                    rate: Number(r.rate),
                  }));
                }
                if (rule.colorSlabRanges?.length) {
                  mergedItem.colorSlabRanges = rule.colorSlabRanges.map((r) => ({
                    from: Number(r.from),
                    to: Number(r.to),
                    rate: Number(r.rate),
                  }));
                }
                if (rule.comboSlabRanges?.length) {
                  mergedItem.comboSlabRanges = rule.comboSlabRanges.map((r) => ({
                    from: Number(r.from),
                    to: Number(r.to),
                    rate: Number(r.rate),
                  }));
                }
              });

              return mergedItem as unknown as NonNullable<CreateInvoicePayload['items']>[number];
            });
          }),
          pricingItems: [],
        };
      }

      await onConfirm(cleanPayload);
    } catch (error) {
      console.error(error);
      toast.error('Failed to create contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updatePricingItem = (index: number, field: string, value: string) => {
    const newItems = [...form.pricingItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, pricingItems: newItems });
  };

  const handleAddSlab = (
    index: number,
    type: 'bwSlabRanges' | 'colorSlabRanges' | 'comboSlabRanges',
  ) => {
    const newItems = [...form.pricingItems];
    const currentSlabs = newItems[index][type] || [];
    newItems[index][type] = [...currentSlabs, { from: '', to: '', rate: '' }];
    setForm({ ...form, pricingItems: newItems });
  };

  const handleRemoveSlab = (
    itemIndex: number,
    type: 'bwSlabRanges' | 'colorSlabRanges' | 'comboSlabRanges',
    slabIndex: number,
  ) => {
    const newItems = [...form.pricingItems];
    const currentSlabs = newItems[itemIndex][type] || [];
    newItems[itemIndex][type] = currentSlabs.filter((_, i) => i !== slabIndex);
    setForm({ ...form, pricingItems: newItems });
  };

  const handleUpdateSlab = (
    itemIndex: number,
    type: 'bwSlabRanges' | 'colorSlabRanges' | 'comboSlabRanges',
    slabIndex: number,
    field: 'from' | 'to' | 'rate',
    value: string,
  ) => {
    const newItems = [...form.pricingItems];
    const currentSlabs = newItems[itemIndex][type] || [];
    currentSlabs[slabIndex] = { ...currentSlabs[slabIndex], [field]: value };
    newItems[itemIndex][type] = currentSlabs;
    setForm({ ...form, pricingItems: newItems });
  };

  const handleRentTypeChange = (newType: string) => {
    // Regenerate rules based on new type
    updateUsageRules(selectedModels, newType);
  };

  const isFixed = form.rentType.startsWith('FIXED');

  return (
    <Dialog open={true} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-4xl p-0 overflow-hidden rounded-2xl border-none shadow-2xl bg-muted/50/50 backdrop-blur-sm h-[90vh] flex flex-col">
        <DialogHeader className="p-6 pb-4 bg-card border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <Calendar size={24} />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold text-slate-800 tracking-tight">
                {initialData ? 'Edit Rent Contract' : 'New Rent Contract'}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {initialData ? `Inv #${initialData.invoiceNumber}` : 'Quotation Configuration'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-8 overflow-y-auto grow scrollbar-hide bg-card/50">
          {/* Section 1: Contract Terms */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400" /> Contract Terms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl bg-card border border-slate-100 shadow-sm">
              {/* Contract Type Toggle */}
              <div className="md:col-span-2 flex gap-4 p-1 bg-slate-100 rounded-lg w-fit">
                {lockSaleType ? (
                  <button className="px-4 py-1.5 text-xs font-bold rounded-md bg-card text-blue-600 shadow-sm cursor-default">
                    {form.saleType === 'RENT' ? 'Rental Contract' : 'Lease Contract'}
                  </button>
                ) : (
                  <>
                    <button
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${form.saleType === 'RENT' ? 'bg-card text-blue-600 shadow-sm' : 'text-muted-foreground hover:text-slate-700'}`}
                      onClick={() => setForm({ ...form, saleType: 'RENT' })}
                    >
                      Rental Contract
                    </button>
                    <button
                      className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${form.saleType === 'LEASE' ? 'bg-card text-blue-600 shadow-sm' : 'text-muted-foreground hover:text-slate-700'}`}
                      onClick={() => setForm({ ...form, saleType: 'LEASE' })}
                    >
                      Lease Contract
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Customer
                </label>
                {initialData ? (
                  <Input
                    value={initialData.customerName}
                    disabled
                    className="bg-muted/50 font-bold text-slate-700"
                  />
                ) : (
                  <CustomerSelect
                    value={form.customerId}
                    onChange={(id) => setForm({ ...form, customerId: id })}
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Tenure (Months)
                </label>
                <Input
                  type="number"
                  value={form.leaseTenureMonths}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      leaseTenureMonths: handleNumberInput(e.target.value),
                    })
                  }
                  placeholder="e.g 12, 24, 36"
                  className="font-bold"
                />
              </div>

              {form.saleType === 'RENT' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    Billing Period
                  </label>
                  <select
                    className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none"
                    value={form.rentPeriod}
                    onChange={(e) => setForm({ ...form, rentPeriod: e.target.value })}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="HALF_YEARLY">Half Yearly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
              )}
              {form.rentPeriod === 'CUSTOM' && form.saleType === 'RENT' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    Billing Cycle (Days)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 10, 15, 45"
                    value={form.billingCycleInDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        billingCycleInDays: handleNumberInput(e.target.value),
                      })
                    }
                    className="font-bold border-blue-200 focus:border-blue-400"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Effective From
                </label>
                <div className="relative">
                  <Input
                    readOnly
                    value={
                      form.effectiveFrom ? format(new Date(form.effectiveFrom), 'dd/MM/yyyy') : ''
                    }
                    placeholder="DD/MM/YYYY"
                    className="font-semibold"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={form.effectiveFrom}
                    onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Effective To
                </label>
                <div className="relative">
                  <Input
                    readOnly
                    value={form.effectiveTo ? format(new Date(form.effectiveTo), 'dd/MM/yyyy') : ''}
                    placeholder="DD/MM/YYYY (Optional)"
                    className="font-semibold"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="date"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={form.effectiveTo}
                    onChange={(e) => setForm({ ...form, effectiveTo: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Product/Machine */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> Identify Machine
            </h4>
            <div className="p-5 rounded-xl bg-card border border-slate-100 shadow-sm space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-muted-foreground uppercase">
                  Select Model
                </label>
                <div className="mb-4">
                  <ModelSelect onSelect={handleModelAdd} />
                </div>

                <div className="space-y-2">
                  {selectedModels.map((model) => (
                    <div
                      key={model.id}
                      className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-bold text-xs uppercase shrink-0">
                          MDL
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-800 truncate">
                            {model.product_name || model.brandRelation?.name
                              ? `${model.product_name || model.brandRelation?.name} ${model.model_name}`
                              : model.model_name}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide truncate">
                            Model No: {model.model_no}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-16">
                          <label className="sr-only">Quantity</label>
                          <Input
                            type="number"
                            min="1"
                            className="h-8 text-xs font-bold text-center px-1 bg-card border-purple-200 focus:border-purple-400"
                            placeholder="Qty"
                            value={model.quantity ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              const qty = val === '' ? 1 : parseInt(val);
                              handleQuantityChange(model.id, qty);
                            }}
                          />
                        </div>
                        <button
                          onClick={() => handleModelRemove(model.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {selectedModels.length === 0 && (
                    <div className="text-xs text-slate-400 font-medium text-center py-4 border border-dashed border-border rounded-lg">
                      No models selected
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Pricing Model */}
          <section className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Pricing Model
            </h4>

            <div className="p-5 rounded-xl bg-card border border-slate-100 shadow-sm space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase">
                    Model Type
                  </label>
                  {form.saleType === 'LEASE' ? (
                    <select
                      className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={form.leaseType}
                      onChange={(e) => {
                        const newLeaseType = e.target.value as 'EMI' | 'FSM';
                        setForm({ ...form, leaseType: newLeaseType });
                        // If switching to FSM, ensure rules are populated based on current Rent Type
                        if (newLeaseType === 'FSM') {
                          // Allow state update to settle? No, use current products
                          // But we need to pass the *new* lease type context or just force update
                          console.log('Switching to FSM, updating rules...');
                          updateUsageRules(selectedModels, form.rentType);
                        }
                      }}
                    >
                      <option value="EMI">EMI Based Lease</option>
                      <option value="FSM">Lease + Full Service Maintenance (FSM)</option>
                    </select>
                  ) : (
                    <div className="hidden" />
                  )}

                  {(form.saleType === 'RENT' ||
                    (form.saleType === 'LEASE' && form.leaseType === 'FSM')) && (
                    <select
                      className="w-full h-10 rounded-lg border border-border bg-card px-3 text-sm font-semibold text-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none"
                      value={form.rentType}
                      onChange={(e) => handleRentTypeChange(e.target.value)}
                    >
                      <option value="FIXED_LIMIT">Fixed Rent + Individual Limit</option>
                      {selectedModels.length > 0 && (
                        // selectedModels.every((p) => p.print_colour === 'BOTH') && (
                        <option value="FIXED_COMBO">Fixed Rent + Combined Limit</option>
                      )}
                      <option value="FIXED_FLAT">Fixed Flat Rent (No Limits)</option>
                      <option value="CPC">CPC (Individual)</option>
                      {selectedModels.length > 0 && (
                        // selectedModels.every((p) => p.print_colour === 'BOTH') && (
                        <option value="CPC_COMBO">CPC (Combined)</option>
                      )}
                    </select>
                  )}
                </div>
              </div>

              {form.saleType === 'LEASE' && (
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                  {form.leaseType === 'EMI' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          Total Lease Amount
                        </label>
                        <Input
                          type="number"
                          value={form.totalLeaseAmount}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              totalLeaseAmount: handleNumberInput(e.target.value),
                            })
                          }
                          className="font-bold text-slate-800"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase">
                          Monthly EMI
                        </label>
                        <Input
                          type="number"
                          value={form.monthlyEmiAmount}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              monthlyEmiAmount: handleNumberInput(e.target.value),
                            })
                          }
                          className="font-bold text-slate-800"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase">
                        Monthly Lease Amount
                      </label>
                      <Input
                        type="number"
                        value={form.monthlyLeaseAmount}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            monthlyLeaseAmount: handleNumberInput(e.target.value),
                          })
                        }
                        className="font-bold text-slate-800"
                      />
                    </div>
                  )}
                  {/* Advance Amount for Lease */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Advance Amount
                    </label>
                    <Input
                      type="number"
                      value={form.advanceAmount}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          advanceAmount: handleNumberInput(e.target.value),
                        })
                      }
                      className="font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}

              {form.saleType === 'RENT' && isFixed && (
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Monthly Rent (QAR)
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.monthlyRent}
                      onChange={(e) =>
                        setForm({ ...form, monthlyRent: handleNumberInput(e.target.value) })
                      }
                      className="font-bold text-slate-800 border-border focus:border-indigo-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-muted-foreground uppercase">
                      Advance (QAR)
                    </label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={form.advanceAmount}
                      onChange={(e) =>
                        setForm({ ...form, advanceAmount: handleNumberInput(e.target.value) })
                      }
                      className="font-bold text-slate-800"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Rules (Moved Down) */}
          {(form.saleType === 'RENT' ||
            (form.saleType === 'LEASE' && form.leaseType === 'FSM')) && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Usage Rules
                </h4>
                {/* Rules are auto-generated from selected products */}
              </div>

              <div className="space-y-3">
                {form.pricingItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-12 gap-4 p-4 rounded-xl border border-dotted border-border bg-card hover:border-emerald-300 transition-all items-end relative group"
                  >
                    <div className="col-span-12 md:col-span-3 space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase">
                        Category
                      </label>
                      <div className="text-sm font-bold text-slate-800 break-words py-2">
                        {item.description}
                      </div>
                    </div>

                    {/* Limit Fields */}
                    {isFixed && form.rentType !== 'FIXED_FLAT' && (
                      <div className="col-span-6 md:col-span-3 space-y-1">
                        {/* Logic to Hide B&W fields if COLOR only, etc - REMOVED, showing all */}
                        <>
                          <label className="text-[9px] font-bold text-slate-400 uppercase">
                            {item.description.startsWith('Combined')
                              ? 'Combined Limit'
                              : 'Free Limit'}
                          </label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={
                              (item.description.startsWith('Combined')
                                ? item.combinedIncludedLimit
                                : item.description.startsWith('Black & White')
                                  ? item.bwIncludedLimit
                                  : item.colorIncludedLimit) ?? ''
                            }
                            onChange={(e) =>
                              updatePricingItem(
                                index,
                                item.description.startsWith('Combined')
                                  ? 'combinedIncludedLimit'
                                  : item.description.startsWith('Black & White')
                                    ? 'bwIncludedLimit'
                                    : 'colorIncludedLimit',
                                handleNumberInput(e.target.value),
                              )
                            }
                            className={`h-9 border-border`}
                          />
                        </>
                      </div>
                    )}

                    {/* Rate Fields */}
                    {form.rentType !== 'FIXED_FLAT' && !form.rentType.includes('CPC') && (
                      <div
                        className={`col-span-6 ${isFixed ? 'md:col-span-3' : 'md:col-span-4'} space-y-1`}
                      >
                        <label className="text-[9px] font-bold text-slate-400 uppercase">
                          {item.description.startsWith('Combined')
                            ? 'Combined Rate (QAR)'
                            : form.rentType.includes('CPC')
                              ? 'Rate/Page (QAR)'
                              : 'Excess Rate (QAR)'}
                        </label>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={
                              (item.description.startsWith('Combined')
                                ? item.combinedExcessRate
                                : item.description.startsWith('Black & White')
                                  ? item.bwExcessRate
                                  : item.colorExcessRate) ?? ''
                            }
                            onChange={(e) =>
                              updatePricingItem(
                                index,
                                item.description.startsWith('Combined')
                                  ? 'combinedExcessRate'
                                  : item.description.startsWith('Black & White')
                                    ? 'bwExcessRate'
                                    : 'colorExcessRate',
                                handleNumberInput(e.target.value),
                              )
                            }
                            className={`h-9 font-bold pl-6 ${isFixed ? 'text-red-600 bg-red-50/50 border-red-100' : 'text-emerald-700 bg-emerald-50/50 border-emerald-100'}`}
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">
                            QAR
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="col-span-12 md:col-span-2 flex justify-end pb-1">
                      {/* Delete managed by product removal */}
                    </div>

                    {/* Slab Rates UI (Only for CPC) */}
                    {!isFixed && form.rentType !== 'FIXED_FLAT' && (
                      <div className="col-span-12 mt-3 pl-4 border-l-2 border-slate-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            Slab Rates
                          </label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2"
                            onClick={() =>
                              handleAddSlab(
                                index,
                                item.description.startsWith('Combined')
                                  ? 'comboSlabRanges'
                                  : item.description.startsWith('Black')
                                    ? 'bwSlabRanges'
                                    : 'colorSlabRanges',
                              )
                            }
                          >
                            + Add Slab
                          </Button>
                        </div>

                        {/* Slab List */}
                        {(item.description.startsWith('Combined')
                          ? item.comboSlabRanges
                          : item.description.startsWith('Black')
                            ? item.bwSlabRanges
                            : item.colorSlabRanges
                        )?.map((slab, sIdx) => {
                          const slabType = item.description.startsWith('Combined')
                            ? 'comboSlabRanges'
                            : item.description.startsWith('Black')
                              ? 'bwSlabRanges'
                              : 'colorSlabRanges';
                          return (
                            <div key={sIdx} className="flex gap-2 items-center">
                              <div className="grid grid-cols-3 gap-2 flex-1">
                                <Input
                                  placeholder="From"
                                  type="number"
                                  value={slab.from}
                                  onChange={(e) =>
                                    handleUpdateSlab(
                                      index,
                                      slabType,
                                      sIdx,
                                      'from',
                                      handleNumberInput(e.target.value),
                                    )
                                  }
                                  className="h-7 text-xs"
                                />
                                <Input
                                  placeholder="To"
                                  type="number"
                                  value={slab.to}
                                  onChange={(e) =>
                                    handleUpdateSlab(
                                      index,
                                      slabType,
                                      sIdx,
                                      'to',
                                      handleNumberInput(e.target.value),
                                    )
                                  }
                                  className="h-7 text-xs"
                                />
                                <Input
                                  placeholder="Rate"
                                  type="number"
                                  value={slab.rate}
                                  onChange={(e) =>
                                    handleUpdateSlab(
                                      index,
                                      slabType,
                                      sIdx,
                                      'rate',
                                      handleNumberInput(e.target.value),
                                    )
                                  }
                                  className="h-7 text-xs font-bold text-blue-600"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-400 hover:bg-red-50"
                                onClick={() => handleRemoveSlab(index, slabType, sIdx)}
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          );
                        })}

                        {(() => {
                          const currentSlabs =
                            (item.description.startsWith('Combined')
                              ? item.comboSlabRanges
                              : item.description.startsWith('Black')
                                ? item.bwSlabRanges
                                : item.colorSlabRanges) || [];

                          const maxTo =
                            currentSlabs.length > 0
                              ? currentSlabs.reduce((max, s) => Math.max(max, Number(s.to) || 0), 0)
                              : 0;

                          const excessField = item.description.startsWith('Combined')
                            ? 'combinedExcessRate'
                            : item.description.startsWith('Black')
                              ? 'bwExcessRate'
                              : 'colorExcessRate';

                          return (
                            <div className="flex gap-2 items-center mt-2 p-2 bg-muted/50/50 rounded border border-slate-100">
                              <div className="flex-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                {maxTo > 0
                                  ? `Rate for usage > ${maxTo}`
                                  : 'Base Rate (Example: > 0)'}
                              </div>
                              <div className="w-24 relative">
                                <Input
                                  placeholder="Rate"
                                  type="number"
                                  step="0.01"
                                  value={
                                    (item.description.startsWith('Combined')
                                      ? item.combinedExcessRate
                                      : item.description.startsWith('Black')
                                        ? item.bwExcessRate
                                        : item.colorExcessRate) ?? ''
                                  }
                                  onChange={(e) =>
                                    updatePricingItem(
                                      index,
                                      excessField,
                                      handleNumberInput(e.target.value),
                                    )
                                  }
                                  className="h-7 text-xs font-bold text-blue-600 pl-4"
                                />
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] font-bold opacity-30">
                                  QAR
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="font-bold text-muted-foreground">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-blue-600 text-white font-bold px-8 shadow-lg shadow-blue-100 hover:bg-blue-700 hover:shadow-blue-200 transition-all flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? 'Update Contract' : 'Create Contract'}
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
