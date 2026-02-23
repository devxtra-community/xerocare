'use client';

import { Toaster } from 'sonner';

/**
 * Global toaster provider component.
 * Configures the sonner toaster for the entire application.
 */
export function ToasterProvider() {
  return <Toaster richColors position="top-right" />;
}
