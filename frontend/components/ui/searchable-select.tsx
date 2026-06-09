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
  disabled?: boolean;
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
  disabled?: boolean;
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
  disabled = false,
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

  const filteredOptions = options.filter((option) => {
    const searchStr = searchQuery.toLowerCase();
    return (
      option.label.toLowerCase().includes(searchStr) ||
      option.value.toLowerCase().includes(searchStr) ||
      (option.description && option.description.toLowerCase().includes(searchStr))
    );
  });

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
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            'w-full justify-between h-10 font-normal px-3 bg-card hover:bg-muted/50 border-input text-foreground items-center flex overflow-hidden',
            className,
          )}
        >
          {selectedOption ? (
            <div className="flex flex-col items-start truncate overflow-hidden">
              <span className="font-bold truncate text-sm text-slate-700">
                {selectedOption.label}
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground font-normal text-sm">{placeholder}</span>
          )}
          {loading ? (
            <Loader2 className="ml-2 h-4 w-4 shrink-0 opacity-50 animate-spin" />
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[800px] p-0 bg-card z-[9999] pointer-events-auto shadow-2xl border-slate-200"
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col bg-card rounded-md">
          {/* Native Search Input */}
          <div className="flex items-center border-b px-4 py-3 bg-slate-50/50">
            <Search className="mr-3 h-5 w-5 shrink-0 text-slate-400" />
            <input
              className={cn(
                'flex h-10 w-full bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50',
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
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  // Selection handler
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!option.disabled) {
                      handleSelect(option);
                    }
                  }}
                  className={cn(
                    'relative flex select-none items-center justify-between rounded-sm px-3 py-2 text-sm outline-none transition-all duration-200 group',
                    option.disabled
                      ? 'cursor-not-allowed opacity-50 bg-muted/50'
                      : 'cursor-pointer hover:bg-blue-600 hover:shadow-sm',
                  )}
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className={cn(
                        'font-bold text-sm transition-colors duration-200 truncate',
                        option.disabled
                          ? 'text-slate-400'
                          : 'text-slate-700 group-hover:text-white',
                      )}
                    >
                      {option.label}
                    </span>
                    {option.description && (
                      <p className="text-[10px] font-medium leading-tight mt-0.5 transition-colors duration-200 text-slate-400 group-hover:text-blue-100 truncate">
                        {option.description}
                      </p>
                    )}
                  </div>
                  <Check
                    className={cn(
                      'ml-2 h-4 w-4 shrink-0 transition-colors duration-200',
                      value === option.value
                        ? 'opacity-100 text-blue-600 group-hover:text-white'
                        : 'opacity-0',
                    )}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
