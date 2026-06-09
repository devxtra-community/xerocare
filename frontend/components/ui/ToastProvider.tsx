'use client';

import * as React from 'react';
import { Toast } from './Toast';

export type ToastType = 'success' | 'error';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = React.createContext<ToastContextProps | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const showToast = React.useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const success = React.useCallback(
    (message: string) => {
      showToast(message, 'success');
    },
    [showToast],
  );

  const error = React.useCallback(
    (message: string) => {
      showToast(message, 'error');
    },
    [showToast],
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, success, error }}>
      {children}
      {/* Toast container at bottom-right of screen */}
      <div className="fixed bottom-4 right-4 z-9999 flex flex-col gap-2 max-w-md w-full pointer-events-none sm:w-[350px]">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
