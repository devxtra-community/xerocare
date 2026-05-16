'use client';

import { useEffect, useState } from 'react';
import { getAllProducts, Product, ProductStatus } from '@/lib/product';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';

export type SelectableItem = Product | SparePart;

interface ProductSelectProps {
  onSelect: (item: SelectableItem) => void;
  mode?: 'PRODUCT' | 'SPAREPART' | 'BOTH';
}

/**
 * Unified searchable select for Products and Spare Parts.
 * Fetches both resources and allows selection for invoice line items.
 */
export function ProductSelect({
  onSelect,
  mode = 'BOTH',
  placeholder,
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
          productsData = await getAllProducts({ limit: 10000 });
        }
        if (mode === 'SPAREPART' || mode === 'BOTH') {
          sparePartsData = await getAllSpareParts({ limit: 10000 });
        }

        setItems([...productsData, ...sparePartsData]);
      } catch (error) {
        console.error('Failed to fetch items', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mode]);

  const handleValueChange = (val: string) => {
    const selected = items.find((item) => item.id === val);
    if (selected) {
      onSelect(selected);
    }
  };

  const options: SearchableSelectOption[] = items.map((item) => {
    let label = '';
    let price = 0;
    let type = '';

    if ('part_name' in item) {
      // SparePart
      label = `${item.part_name} (Lot: ${item.lotNumber})`;
      price = Number(item.base_price) || 0;
      type = 'Spare Part';
    } else {
      // Product
      label = `${item.name} ${item.model?.model_name ? `- ${item.model.model_name}` : ''}`;

      // Clearly highlight product status (in stock vs out of stock/rented/leased)
      let statusLabel = '';
      if (!item.product_status || item.product_status === ProductStatus.AVAILABLE) {
        statusLabel = '[IN STOCK]';
      } else {
        statusLabel = `[${item.product_status.toUpperCase()}]`;
      }

      label = `${statusLabel} ${label}`;

      price = item.sale_price || 0;
      type = 'Product';
    }

    return {
      value: item.id,
      label: label,
      description: `${type} • QAR ${price.toLocaleString()}`,
      disabled:
        'product_status' in item &&
        item.product_status !== ProductStatus.AVAILABLE &&
        item.product_status !== undefined,
    };
  });

  return (
    <SearchableSelect
      onValueChange={handleValueChange}
      options={options}
      loading={loading}
      placeholder={placeholder || 'Select Product'}
      emptyText="No items found."
    />
  );
}
