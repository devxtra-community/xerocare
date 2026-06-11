'use client';

import * as React from 'react';
import { Modal } from './Modal';

interface DetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  contentClassName?: string;
}

export function DetailDialog({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '2xl',
  contentClassName = 'mt-2 max-h-[70vh] overflow-y-auto pr-2',
}: DetailDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth={maxWidth}
      title={title}
      showCloseButton={true}
      closeOnOutsideClick={true}
    >
      <div className={contentClassName}>{children}</div>
    </Modal>
  );
}
