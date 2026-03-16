import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * This tool helps the computer combine different "Stickers" (styles) onto a single button or area
 * without them conflicting with each other.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
