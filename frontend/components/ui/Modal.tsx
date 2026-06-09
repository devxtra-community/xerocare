'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  title?: string;
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = 'md',
  title,
  showCloseButton = true,
  closeOnOutsideClick = true,
}: ModalProps) {
  // Map maxWidth string to tailwind class
  const maxWidthClass = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
  }[maxWidth];

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        {/* Backdrop: bg-black/40 backdrop-blur-sm */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity duration-150 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <DialogPrimitive.Content
            onPointerDownOutside={(e) => {
              if (!closeOnOutsideClick) {
                e.preventDefault();
              }
            }}
            className={cn(
              'relative w-full bg-white rounded-xl shadow-xl p-6 overflow-hidden outline-none',
              'transition-all duration-150 ease-out',
              'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:scale-100 data-[state=open]:duration-150',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:scale-95 data-[state=closed]:duration-150',
              'scale-95 opacity-0 data-[state=open]:opacity-100 data-[state=open]:scale-100',
              maxWidthClass,
            )}
          >
            {title ? (
              <div className="mb-4">
                <DialogPrimitive.Title className="text-xl font-bold text-gray-900">
                  {title}
                </DialogPrimitive.Title>
              </div>
            ) : (
              <DialogPrimitive.Title className="sr-only">Modal Dialog</DialogPrimitive.Title>
            )}

            {showCloseButton && (
              <DialogPrimitive.Close
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
              >
                <X className="size-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            )}

            <div>{children}</div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
