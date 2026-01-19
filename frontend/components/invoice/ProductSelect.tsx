'use client';

import { useEffect, useState } from 'react';
import { getAllProducts, Product } from '@/lib/product';
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete';

interface ProductSelectProps {
  onSelect: (product: Product) => void;
}

export function ProductSelect({ onSelect }: ProductSelectProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await getAllProducts();
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch products', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const options: AutocompleteOption[] = products.map((p) => ({
    value: p.id,
    label: p.name,
    description: `₹${p.sale_price?.toLocaleString() || 0} - Status: ${p.product_status || 'N/A'}`,
    raw: p,
  }));

  return (
    <Autocomplete
      options={options}
      onSelect={(opt) => onSelect(opt.raw as Product)}
      placeholder="Add Product (Search by name)..."
      emptyText="No products found."
      loading={loading}
      className="w-full"
      onValueChange={() => {}} // dummy to allow component to handle clearing internally if we wanted, but we actually want to trigger onSelect
    />
  );
}
