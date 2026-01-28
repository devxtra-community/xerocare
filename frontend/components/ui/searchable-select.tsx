'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  [key: string]: unknown;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  onSelect?: (option: SearchableSelectOption) => void;
  placeholder?: string;
  emptyText?: string;
  loading?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  onSelect,
  placeholder = 'Select option...',
  emptyText = 'No results found.',
  loading = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const selectedOption = options.find((option) => option.value === value);

  // Reset search when opening
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelect = (option: SearchableSelectOption) => {
    onValueChange(option.value);
    onSelect?.(option);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-10 px-3 bg-white hover:bg-slate-50 border-input text-slate-900',
            className,
          )}
        >
          {selectedOption ? (
            <div className="flex flex-col items-start truncate overflow-hidden">
              <span className="font-bold truncate text-sm">{selectedOption.label}</span>
            </div>
          ) : (
            <span className="text-slate-500 font-normal text-sm">{placeholder}</span>
          )}
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 opacity-50 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0 bg-white z-[9999] pointer-events-auto"
        align="start"
      >
        <div className="flex flex-col bg-white rounded-md">
          {/* Native Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className={cn(
                'flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
              )}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              // Prevent input click from closing popover if propagating
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Custom List */}
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">{emptyText}</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  // Robust Mouse Handler: onMouseDown handles selection immediately and reliably
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-blue-100 transition-colors group"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-bold text-sm text-slate-700">{option.label}</span>
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4 text-blue-600',
                        value === option.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  </div>
                  {option.description && (
                    <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5 ml-0">
                      {option.description}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
