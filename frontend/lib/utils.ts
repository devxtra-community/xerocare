import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * This tool helps the computer combine different "Stickers" (styles) onto a single button or area
 * without them conflicting with each other.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generates a unique, alphanumeric Lot ID with format LT-XXXX-XXXX.
 */
export function generateLotId() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const segment = () => {
    let res = '';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `LT-${segment()}-${segment()}`;
}
