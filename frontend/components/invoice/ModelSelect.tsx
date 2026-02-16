'use client';

import { useEffect, useState } from 'react';
import { getAllModels, Model } from '@/lib/model';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';

interface ModelSelectProps {
  onSelect: (model: Model) => void;
}

/**
 * Searchable select component for machine models.
 * Displays model name, number, and availability status.
 */
export function ModelSelect({ onSelect }: ModelSelectProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getAllModels();
        setModels(data);
      } catch (error) {
        console.error('Failed to fetch models', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleValueChange = (val: string) => {
    const selected = models.find((m) => m.id === val);
    if (selected) {
      onSelect(selected);
    }
  };

  const options: SearchableSelectOption[] = models.map((model) => {
    const prefix = model.product_name || model.brandRelation?.name;
    return {
      value: model.id,
      label: prefix ? `${prefix} ${model.model_name}` : model.model_name,
      description: `Model No: ${model.model_no} • Available: ${model.quantity}`,
      disabled: model.quantity <= 0,
    };
  });

  return (
    <SearchableSelect
      onValueChange={handleValueChange}
      options={options}
      loading={loading}
      placeholder="Select Model"
      emptyText="No models found."
    />
  );
}
