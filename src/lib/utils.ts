export function sanitizeForPostgrest(value: string): string {
  return value.replace(/[.,()*]/g, ' ').trim();
}

export function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol === 'http:' || u.protocol === 'https:') return url;
    return '#';
  } catch {
    return '#';
  }
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
