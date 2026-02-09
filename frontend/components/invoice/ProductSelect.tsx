'use client';

import { useEffect, useState } from 'react';
import { getAllProducts, Product, ProductStatus } from '@/lib/product';
import { getAllSpareParts, SparePart } from '@/lib/spare-part';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';

export type SelectableItem = Product | SparePart;

interface ProductSelectProps {
  onSelect: (item: SelectableItem) => void;
}

export function ProductSelect({ onSelect }: ProductSelectProps) {
  const [items, setItems] = useState<SelectableItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsData, sparePartsData] = await Promise.all([
          getAllProducts(),
          getAllSpareParts(),
        ]);

        setItems([...productsData, ...sparePartsData]);
      } catch (error) {
        console.error('Failed to fetch items', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleValueChange = (val: string) => {
    const selected = items.find((item) => item.id === val);
    if (selected) {
      if ('product_status' in selected && selected.product_status !== ProductStatus.AVAILABLE) {
        // Double check, though UI should prevent this
        return;
      }
      onSelect(selected);
    }
  };

  const options: SearchableSelectOption[] = items.map((item) => {
    let label = '';
    let price = 0;
    let type = '';
    let disabled = false;

    if ('part_name' in item) {
      // SparePart
      label = `${item.part_name} (Lot: ${item.lot_number})`;
      price = Number(item.base_price) || 0;
      type = 'Spare Part';
    } else {
      // Product
      label = `${item.name} (SN: ${item.serial_no})`;
      price = item.sale_price || 0;
      type = 'Product';
      if (item.product_status !== ProductStatus.AVAILABLE) {
        label += ` (${item.product_status})`;
        disabled = true;
      }
    }

    return {
      value: item.id,
      label: label,
      description: `${type} • ₹${price.toLocaleString()}`,
      disabled,
    };
  });

  return (
    <SearchableSelect
      onValueChange={handleValueChange}
      options={options}
      loading={loading}
      placeholder="Select Product or Spare Part"
      emptyText="No items found."
    />
  );
}
