'use client';

import { useEffect, useState } from 'react';
import { getCustomers } from '@/lib/customer';
import { getLeads, Lead } from '@/lib/lead';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/searchable-select';
import { LeadConversionDialog } from './LeadConversionDialog';

// Unified Selectable Entity
export type SelectableCustomer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  type: 'CUSTOMER' | 'LEAD';
  isCustomer?: boolean; // From Lead
  customerId?: string; // From Lead if converted
  // Allow raw access if needed
  [key: string]: unknown;
};

interface CustomerSelectProps {
  value?: string;
  onChange: (id: string, entity: SelectableCustomer) => void;
}

export function CustomerSelect({ value, onChange }: CustomerSelectProps) {
  const [items, setItems] = useState<SelectableCustomer[]>([]);
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [customersData, leadsData] = await Promise.all([getCustomers(), getLeads()]);

        const unifiedCustomers: SelectableCustomer[] = customersData.map((c) => ({
          ...c,
          id: c.id,
          name: c.name,
          phone: c.phone || '',
          email: c.email || '',
          type: 'CUSTOMER',
        }));

        const unifiedLeads: SelectableCustomer[] = leadsData
          .filter((l) => !l.isCustomer && !l.customerId) // Filter out converted leads
          .map((l) => ({
            ...l,
            id: l._id,
            name: l.name || 'Unnamed Lead',
            phone: l.phone,
            email: l.email,
            type: 'LEAD',
            isCustomer: l.isCustomer,
            customerId: l.customerId,
          }));

        setItems([...unifiedCustomers, ...unifiedLeads]);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleValueChange = (val: string) => {
    const entity = items.find((item) => item.id === val);
    if (!entity) return;

    if (entity.type === 'CUSTOMER') {
      onChange(entity.id, entity);
    } else if (entity.type === 'LEAD') {
      if (entity.isCustomer && entity.customerId) {
        onChange(entity.customerId, {
          ...entity,
          id: entity.customerId,
          type: 'CUSTOMER',
        });
      } else {
        // Needs conversion
        setSelectedLead(entity as unknown as Lead);
        setDialogOpen(true);
      }
    }
  };

  const options: SearchableSelectOption[] = items.map((item) => ({
    value: item.id,
    label: item.name,
    description:
      item.type === 'CUSTOMER'
        ? `Customer • ${item.phone || 'No phone'}`
        : `Lead • ${item.phone || 'No phone'}`,
  }));

  return (
    <>
      <SearchableSelect
        value={value}
        onValueChange={handleValueChange}
        options={options}
        loading={loading}
        placeholder="Select Customer or Lead"
        emptyText="No customers found."
      />

      <LeadConversionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lead={selectedLead}
        onConverted={(customerId) => {
          if (selectedLead) {
            // After conversion, update parent immediately
            onChange(customerId, {
              ...selectedLead,
              id: customerId,
              type: 'CUSTOMER',
              name: selectedLead.name,
              phone: selectedLead.phone,
              email: selectedLead.email,
            } as SelectableCustomer);
          }
        }}
      />
    </>
  );
}
