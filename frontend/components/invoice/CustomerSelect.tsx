'use client';

import { useEffect, useState } from 'react';
import { getCustomers } from '@/lib/customer';
import { getLeads, Lead } from '@/lib/lead';
import { Autocomplete, AutocompleteOption } from '@/components/ui/autocomplete';
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
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  // const [allEntities, setAllEntities] = useState<SelectableCustomer[]>([]); // unused

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // const selectedOption = useMemo( // unused
  //     () => options.find(o => o.value === value) ?? null,
  //     [options, value]
  // );

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

        const unifiedLeads: SelectableCustomer[] = leadsData.map((l) => ({
          ...l,
          id: l._id,
          name: l.name || 'Unnamed Lead',
          phone: l.phone,
          email: l.email,
          type: 'LEAD',
          isCustomer: l.isCustomer,
          customerId: l.customerId,
        }));

        // setAllEntities([...unifiedCustomers, ...unifiedLeads]);

        const customerOptions: AutocompleteOption[] = unifiedCustomers.map((c) => ({
          value: c.id,
          label: c.name,
          description: `Customer • ${c.phone || c.email || 'No contact'}`,
          raw: c,
        }));

        const leadOptions: AutocompleteOption[] = unifiedLeads.map((l) => ({
          value: l.id,
          label: l.name || 'Unnamed Lead',
          description: `Lead • ${l.status || 'Active'} • ${l.phone || l.email || 'No contact'}`,
          raw: l,
        }));

        setOptions([...customerOptions, ...leadOptions]);
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelect = (option: AutocompleteOption) => {
    console.log('CustomerSelect: Option Selected:', option);
    const entity = option.raw as SelectableCustomer;

    if (entity.type === 'CUSTOMER') {
      onChange(entity.id, entity);
    } else if (entity.type === 'LEAD') {
      if (entity.isCustomer && entity.customerId) {
        console.log(
          'CustomerSelect: Lead is already converted, using customerId:',
          entity.customerId,
        );
        onChange(entity.customerId, {
          ...entity,
          id: entity.customerId,
          type: 'CUSTOMER',
        });
      } else {
        console.log('CustomerSelect: Lead needs conversion:', entity);
        // Needs conversion
        setSelectedLead(entity as unknown as Lead);
        setDialogOpen(true);
      }
    }
  };

  return (
    <>
      <Autocomplete
        options={options}
        value={value}
        onSelect={handleSelect}
        placeholder="Search customers or leads..."
        emptyText="No results found."
        loading={loading}
        className="w-full"
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
