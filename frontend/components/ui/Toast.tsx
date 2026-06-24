'use client';

import * as React from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white font-medium text-sm transition-all duration-300 transform animate-slide-in-right',
        type === 'success'
          ? 'bg-green-600 border border-green-500'
          : 'bg-red-600 border border-red-500',
      )}
    >
      <div className="flex-shrink-0">
        {type === 'success' ? (
          <span className="inline-flex items-center justify-center size-5 bg-white/20 rounded-full">
            <Check className="size-3.5 text-white" />
          </span>
        ) : (
          <span className="inline-flex items-center justify-center size-5 bg-white/20 rounded-full">
            <AlertCircle className="size-3.5 text-white" />
          </span>
        )}
      </div>
      <div className="flex-grow">{message}</div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-white/70 hover:text-white hover:bg-white/10 rounded-full p-0.5 transition-colors focus:outline-none"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
