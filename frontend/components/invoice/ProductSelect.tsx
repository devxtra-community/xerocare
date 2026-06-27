'use client';

import { useEffect, useState } from 'react';
import { getAllProducts, Product, ProductStatus } from '@/lib/product';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';

export type SelectableItem = Product | SparePart;

interface ProductSelectProps {
  onSelect: (item: SelectableItem) => void;
  mode?: 'PRODUCT' | 'SPAREPART' | 'BOTH';
  className?: string;
  onlyAvailable?: boolean;
  selectedQuantities?: Record<string, number>;
}

/**
 * Unified searchable select for Products and Spare Parts.
 * Fetches both resources and allows selection for invoice line items.
 */
export function ProductSelect({
  onSelect,
  mode = 'BOTH',
  placeholder,
  className,
  onlyAvailable = true,
  selectedQuantities,
}: ProductSelectProps & { placeholder?: string }) {
  const [items, setItems] = useState<SelectableItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let productsData: Product[] = [];
        let sparePartsData: SparePart[] = [];

        if (mode === 'PRODUCT' || mode === 'BOTH') {
          const fetchParams: { limit?: number; status?: string } = { limit: 10000 };
          // Fetch all products for the branch to handle local filtering of multi-status (AVAILABLE, RETURNED, DAMAGED)
          productsData = await getAllProducts(fetchParams);

          if (onlyAvailable) {
            const allowedStatuses = [
              ProductStatus.AVAILABLE,
              ProductStatus.RETURNED,
              ProductStatus.DAMAGED,
            ];
            productsData = productsData.filter((p) => allowedStatuses.includes(p.product_status));
          }
        }
        if (mode === 'SPAREPART' || mode === 'BOTH') {
          const allSpares = await getAllSpareParts({ limit: 10000 });
          if (onlyAvailable) {
            sparePartsData = allSpares.filter(
              (sp) => (sp as SparePart & { quantity?: number }).quantity! > 0,
            );
          } else {
            sparePartsData = allSpares;
          }
        }

        setItems([...productsData, ...sparePartsData]);
      } catch (error) {
        console.error('Failed to fetch items', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mode, onlyAvailable]);

  const handleValueChange = (val: string) => {
    const selected = items.find((item) => item.id === val);
    if (selected) {
      onSelect(selected);
    }
  };

  const options: SearchableSelectOption[] = items.map((item) => {
    let label: React.ReactNode = '';
    let price = 0;
    let type = '';
    let availableStock = 1;

    if ('part_name' in item) {
      // SparePart
      const sp = item as SparePart & { quantity?: number };
      label = `${item.part_name} (Lot: ${item.lotNumber})`;
      price = Number(item.base_price) || 0;
      type = 'Spare Part';
      availableStock = typeof sp.quantity === 'number' ? sp.quantity : 999999;
    } else {
      // Product
      const baseLabel = `${item.name} ${item.model?.model_name ? `- ${item.model.model_name}` : ''}`;

      // Colorize brackets based on status
      let statusNode: React.ReactNode = null;
      if (item.product_status === ProductStatus.DAMAGED) {
        statusNode = (
          <span className="text-red-600 font-extrabold ml-1.5 animation-pulse"> [DAMAGED]</span>
        );
      } else if (item.product_status === ProductStatus.RETURNED) {
        statusNode = <span className="text-green-600 font-extrabold ml-1.5"> [RETURNED]</span>;
      } else if (item.product_status && item.product_status !== ProductStatus.AVAILABLE) {
        statusNode = (
          <span className="text-slate-400 font-bold ml-1.5">
            {' '}
            [{item.product_status.toUpperCase()}]
          </span>
        );
      }

      label = (
        <span className="flex items-center">
          {baseLabel}
          {statusNode}
        </span>
      ) as React.ReactNode;

      price = item.sale_price || 0;
      type = 'Product';

      const isAvailable = !item.product_status || item.product_status === ProductStatus.AVAILABLE;
      if (!isAvailable) {
        availableStock = 0;
      } else {
        availableStock =
          typeof (item as unknown as Record<string, unknown>).stock === 'number'
            ? ((item as unknown as Record<string, unknown>).stock as number)
            : 1;
      }
    }

    const selectedQty = selectedQuantities?.[item.id] || 0;
    const isDisabled = selectedQty >= availableStock;

    return {
      value: item.id,
      label: label,
      description: `${type} • QAR ${price.toLocaleString()} • Available: ${availableStock}${selectedQty > 0 ? ` (Selected: ${selectedQty})` : ''}`,
      disabled: isDisabled,
    };
  });

  return (
    <SearchableSelect
      onValueChange={handleValueChange}
      options={options}
      loading={loading}
      placeholder={placeholder || 'Select Product'}
      emptyText="No items found."
      className={className}
    />
  );
}
