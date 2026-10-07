'use client';

import * as React from 'react';
import { Modal } from './Modal';
import { Button, buttonVariants } from './button'; // use the existing lowercase/uppercase button
import { LoadingButton } from './LoadingButton';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
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
      icon: <AlertTriangle className="size-6 text-destructive" />,
      iconBg: 'bg-destructive/10',
      confirmVariant: 'destructive' as const,
      confirmClass: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground',
    },
    positive: {
      icon: <CheckCircle2 className="size-6 text-success" />,
      iconBg: 'bg-success/10',
      confirmVariant: 'success' as const,
      confirmClass: 'bg-success hover:bg-success/90 text-success-foreground',
    },
    neutral: {
      icon: <Info className="size-6 text-primary" />,
      iconBg: 'bg-primary/10',
      confirmVariant: 'default' as const,
      confirmClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    },
  }[type];

  // Self-locking: callers don't always pass `isLoading` (and it can't cover the very
  // first click anyway), so the dialog tracks its own in-flight state. A second click
  // while the API call is running is ignored instead of firing the action twice.
  const [pending, setPending] = React.useState(false);
  const busy = isLoading || pending;

  const handleConfirm = async () => {
    if (busy) return;
    setPending(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error('Error during confirmation callback:', error);
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="sm"
      showCloseButton={!busy}
      closeOnOutsideClick={!busy}
    >
      <div className="flex flex-col items-center text-center p-2">
        {/* Icon at top center */}
        <div className={cn('p-3 rounded-full mb-4', typeConfig.iconBg)}>{typeConfig.icon}</div>

        {/* Title */}
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>

        {/* Description */}
        <div className="text-sm text-muted-foreground mb-6 leading-relaxed">{description}</div>

        {/* Two buttons at bottom right (flex layout centered/spaced for dialog) */}
        <div className="flex w-full items-center justify-end gap-3 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={busy}
            className="text-muted-foreground border-border hover:bg-muted hover:text-foreground min-w-[90px] h-9"
          >
            {cancelText}
          </Button>
          <LoadingButton
            onClick={handleConfirm}
            loading={busy}
            loadingText="Processing..."
            disabled={busy}
            className={cn(
              buttonVariants({ variant: typeConfig.confirmVariant }),
              'min-w-[100px] h-9',
              typeConfig.confirmClass,
            )}
          >
            {confirmText}
          </LoadingButton>
        </div>
      </div>
    </Modal>
  );
}
