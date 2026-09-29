'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, required, onWheel, ...props }, ref) => {
    // A focused <input type="number"> changes its value when the mouse wheel is
    // scrolled over it — one `step` per notch, silently. On a money field with
    // step="0.01" that turns a typed 150000 into 149999.99 with no keystroke and no
    // visible cause, and the wrong figure is what gets saved.
    //
    // Blurring on wheel is the standard remedy: the value is left alone and the page
    // scrolls normally instead. Applied here rather than per-field so every amount,
    // meter reading and quantity input in the app is covered.
    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (type === 'number' && e.currentTarget === document.activeElement) {
        e.currentTarget.blur();
      }
      onWheel?.(e);
    };

    return (
      <div className="w-full">
        <input
          type={type}
          ref={ref}
          onWheel={handleWheel}
          // aria-required keeps the visual asterisk pattern callers already render in
          // their labels honest for assistive technology, without changing any markup.
          aria-required={required || undefined}
          className={cn(
            // One focus treatment everywhere: a 2px border shift without a layout jump
            // (the inset ring supplies the extra weight) plus a soft token-coloured halo.
            'w-full min-w-0 px-3 py-2 text-sm bg-white border border-gray-300 rounded-[6px] shadow-sm transition-[border-color,box-shadow] duration-150',
            'outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted',
            // The invalid state is announced by the halo too, not the border hue alone —
            // colour is never the only signal.
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : '',
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
