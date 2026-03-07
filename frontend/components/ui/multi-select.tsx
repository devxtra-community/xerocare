'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Loader2, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export interface MultiSelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  values?: string[];
  onValuesChange: (values: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  loading?: boolean;
  className?: string;
}

export function MultiSelect({
  options,
  values = [],
  onValuesChange,
  placeholder = 'Select options...',
  emptyText = 'No results found.',
  loading = false,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Reset search when opening
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const selectedOptions = options.filter((option) => values.includes(option.value));

  const handleSelect = (option: MultiSelectOption) => {
    if (values.includes(option.value)) {
      onValuesChange(values.filter((v) => v !== option.value));
    } else {
      // If "universal" is selected, unselect others
      if (option.value === 'universal' || option.value === 'null') {
        onValuesChange([option.value]);
      } else {
        // Unselect "universal" if selecting another
        onValuesChange([...values.filter((v) => v !== 'universal' && v !== 'null'), option.value]);
      }
    }
  };

  const handleRemove = (valueToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValuesChange(values.filter((v) => v !== valueToRemove));
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between min-h-10 px-3 bg-card hover:bg-muted/50 border-input text-foreground h-auto items-center flex-wrap gap-1 py-1.5',
            className,
          )}
        >
          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-1 items-center max-w-[90%] pointer-events-auto">
              {selectedOptions.map((option) => (
                <Badge
                  key={option.value}
                  variant="secondary"
                  className="mr-1 py-0.5 px-2 text-xs font-normal"
                >
                  {option.label}
                  <div
                    role="button"
                    tabIndex={0}
                    className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive hover:text-destructive-foreground z-10 cursor-pointer"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRemove(option.value, e as unknown as React.MouseEvent);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleRemove(option.value, e);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </div>
                </Badge>
              ))}
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
        className="w-[--radix-popover-trigger-width] p-0 bg-card z-[9999] pointer-events-auto"
        align="start"
      >
        <div className="flex flex-col bg-card rounded-md">
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className={cn(
                'flex h-9 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
              )}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = values.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!option.disabled) {
                        handleSelect(option);
                      }
                    }}
                    className={cn(
                      'relative flex select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-all duration-200 group',
                      option.disabled
                        ? 'cursor-not-allowed opacity-50 bg-muted/50'
                        : 'cursor-pointer hover:bg-blue-600 hover:shadow-sm',
                    )}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span
                        className={cn(
                          'font-bold text-sm transition-colors duration-200',
                          option.disabled
                            ? 'text-slate-400'
                            : 'text-slate-700 group-hover:text-white',
                        )}
                      >
                        {option.label}
                      </span>
                      <Check
                        className={cn(
                          'ml-auto h-4 w-4 transition-colors duration-200',
                          isSelected
                            ? 'opacity-100 text-blue-600 group-hover:text-white'
                            : 'opacity-0',
                        )}
                      />
                    </div>
                    {option.description && (
                      <p className="text-[10px] font-medium leading-tight mt-0.5 ml-0 transition-colors duration-200 text-slate-400 group-hover:text-blue-100">
                        {option.description}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
