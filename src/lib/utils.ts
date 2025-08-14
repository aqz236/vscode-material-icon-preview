import {  clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {ClassValue} from 'clsx';

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
      await navigator.clipboard.writeText(text);
      return true;
  } catch (error) {
    console.error('Copy failed:', error);
    return false;
  }
}
