'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import { fetchOwners, createOwner, type Owner } from '@/lib/finance/accountsApi';

interface OwnerSelectProps {
  value: string;
  onChange: (ownerId: string) => void;
  label?: string;
  required?: boolean;
}

// Dropdown + inline "quick add" for the Owners/Shareholders reference list —
// used by every Equity type that tracks a specific owner (Share Capital,
// Owner Contribution, Dividend, Withdrawal). New equity entries need a real
// owner to point at from day one, so creating one can't require leaving the form.
export default function OwnerSelect({
  value,
  onChange,
  label = 'Owner / Shareholder',
  required,
}: OwnerSelectProps) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: owners = [], isLoading } = useQuery({
    queryKey: ['owners'],
    queryFn: () => fetchOwners(),
    staleTime: 60 * 1000,
  });

  const createMut = useMutation({
    mutationFn: createOwner,
    onSuccess: (owner) => {
      qc.invalidateQueries({ queryKey: ['owners'] });
      toast.success(`Owner "${owner.name}" added`);
      onChange(owner.id);
      setAdding(false);
      setNewName('');
    },
    onError: () => toast.error('Failed to add owner'),
  });

  const handleQuickAdd = () => {
    if (!newName.trim()) {
      toast.error('Owner name is required');
      return;
    }
    createMut.mutate({ name: newName.trim() });
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {!adding ? (
        <div className="flex gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={required}
          >
            <option value="">{isLoading ? 'Loading…' : '— select owner —'}</option>
            {owners.map((o: Owner) => (
              <option key={o.id} value={o.id}>
                {o.name}
                {o.ownershipPercent != null ? ` (${o.ownershipPercent}%)` : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 border rounded-lg px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-1"
            title="Add new owner"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Owner / shareholder name"
            className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickAdd();
              }
            }}
          />
          <button
            type="button"
            onClick={handleQuickAdd}
            disabled={createMut.isPending}
            className="shrink-0 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {createMut.isPending ? '…' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewName('');
            }}
            className="shrink-0 border rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
