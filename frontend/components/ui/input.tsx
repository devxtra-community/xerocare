'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          ref={ref}
          className={cn(
            'w-full min-w-0 px-3 py-2 text-sm bg-white border border-gray-300 rounded-[6px] shadow-sm transition-colors',
            'outline-none focus:outline-none focus:border-blue-500 focus:ring-0 focus:border-[2px]',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-red-500 focus:border-red-500' : '',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
