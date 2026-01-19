'use client';

import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  [key: string]: unknown;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  placeholder?: string;
  emptyText?: string;
  loading?: boolean;
  className?: string;
}

// ... imports

export function Autocomplete({
  options,
  value,
  onValueChange,
  onSelect,
  placeholder = 'Search...',
  emptyText = 'No results found.',
  loading = false,
  className,
}: AutocompleteProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  // Update internal input value when external value changes
  React.useEffect(() => {
    console.log('Autocomplete: value prop changed:', value);
    const selected = options.find((opt) => opt.value === value);
    if (selected) {
      console.log('Autocomplete: Found option for value:', selected.label);
      setInputValue(selected.label);
    } else {
      console.log('Autocomplete: No option found for value:', value);
      if (!value) setInputValue('');
    }
  }, [value, options]);

  const handleSelect = (option: AutocompleteOption) => {
    console.log('Autocomplete: handleSelect called via click/enter', option);
    setInputValue(option.label);
    onValueChange?.(option.value);
    onSelect?.(option);
    setIsOpen(false);
  };

  const handleClear = () => {
    setInputValue('');
    onValueChange?.('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Manual filtering
  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.description?.toLowerCase().includes(inputValue.toLowerCase()),
  );

  return (
    <Command shouldFilter={false} className={cn('overflow-visible bg-transparent', className)}>
      <div className="group relative rounded-xl border border-slate-200 bg-white px-3 py-2 transition-all focus-within:ring-4 focus-within:ring-primary/10 focus-within:border-primary">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={(val) => {
              setInputValue(val);
              setIsOpen(true);
              if (!val) onValueChange?.('');
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              setTimeout(() => setIsOpen(false), 200);
            }}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-400 placeholder:font-normal"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : inputValue ? (
            <button
              onClick={handleClear}
              className="rounded-full p-0.5 hover:bg-slate-100 transition-colors"
              type="button" // Important preventing form submit
            >
              <X className="h-3 w-3 text-slate-400" />
            </button>
          ) : null}
        </div>

        {isOpen && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            className="absolute left-0 top-full z-50 mt-2 w-full rounded-xl border border-slate-100 bg-white p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[300px] overflow-auto"
          >
            <CommandList>
              <CommandGroup>
                {filteredOptions.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-400">{emptyText}</div>
                ) : (
                  filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => handleSelect(option)}
                      className="flex flex-col items-start gap-0.5 rounded-lg px-3 py-2 aria-selected:bg-slate-50 aria-selected:text-slate-900 cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option);
                      }}
                    >
                      <span className="text-sm font-bold">{option.label}</span>
                      {option.description && (
                        <span className="text-[10px] text-slate-500 font-medium leading-none">
                          {option.description}
                        </span>
                      )}
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </div>
    </Command>
  );
}
