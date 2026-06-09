'use client';

import * as React from 'react';
import { Modal } from './Modal';
import { Button } from './button'; // use the existing lowercase/uppercase button
import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  type?: 'destructive' | 'positive' | 'neutral';
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  onConfirm,
  type = 'neutral',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
}: ConfirmDialogProps) {
  // Configs for types
  const typeConfig = {
    destructive: {
      icon: <AlertTriangle className="size-6 text-red-600" />,
      iconBg: 'bg-red-50',
      confirmVariant: 'destructive' as const,
      confirmClass: 'bg-red-600 hover:bg-[#991b1b] text-white',
    },
    positive: {
      icon: <CheckCircle2 className="size-6 text-green-600" />,
      iconBg: 'bg-green-50',
      confirmVariant: 'success' as const,
      confirmClass: 'bg-green-600 hover:bg-[#14532d] text-white',
    },
    neutral: {
      icon: <Info className="size-6 text-blue-600" />,
      iconBg: 'bg-blue-50',
      confirmVariant: 'default' as const,
      confirmClass: 'bg-blue-600 hover:bg-[#1e3a8a] text-white',
    },
  }[type];

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error during confirmation callback:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      showCloseButton={!isLoading}
      closeOnOutsideClick={!isLoading}
    >
      <div className="flex flex-col items-center text-center p-2">
        {/* Icon at top center */}
        <div className={cn('p-3 rounded-full mb-4', typeConfig.iconBg)}>{typeConfig.icon}</div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>

        {/* Description */}
        <div className="text-sm text-gray-500 mb-6 leading-relaxed">{description}</div>

        {/* Two buttons at bottom right (flex layout centered/spaced for dialog) */}
        <div className="flex w-full items-center justify-end gap-3 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-500 border-gray-300 hover:bg-gray-50 hover:text-gray-700 min-w-[90px] h-9"
          >
            {cancelText}
          </Button>
          <Button
            variant={typeConfig.confirmVariant}
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn('min-w-[100px] h-9', typeConfig.confirmClass)}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-1.5" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
