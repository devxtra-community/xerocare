'use client';

import * as React from 'react';
import { Modal } from './Modal';

interface DetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function DetailDialog({ isOpen, onClose, title, children }: DetailDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="2xl"
      title={title}
      showCloseButton={true}
      closeOnOutsideClick={true}
    >
      <div className="mt-2 max-h-[70vh] overflow-y-auto pr-2">{children}</div>
    </Modal>
  );
}
