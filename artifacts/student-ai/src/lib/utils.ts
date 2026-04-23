import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// GMT +2 (Lusaka, Zambia) timezone utilities
const LUSAKA_TIMEZONE_OFFSET = 2; // GMT +2

/**
 * Get current time in GMT +2 timezone (Lusaka, Zambia)
 * Returns time in HH:MM format (24-hour)
 */
export function getGMT2Time(): string {
  const now = new Date();
  
  // Get UTC time and apply GMT +2 offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const gmtTime = new Date(utcTime + (LUSAKA_TIMEZONE_OFFSET * 60 * 60 * 1000));
  
  const hours = String(gmtTime.getHours()).padStart(2, '0');
  const minutes = String(gmtTime.getMinutes()).padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * Get current date and time in GMT +2 timezone
 * Returns both date (DD/MM/YYYY) and time (HH:MM)
 */
export function getGMT2DateTime(): { date: string; time: string; day: string } {
  const now = new Date();
  
  // Get UTC time and apply GMT +2 offset
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const gmtTime = new Date(utcTime + (LUSAKA_TIMEZONE_OFFSET * 60 * 60 * 1000));
  
  const day = gmtTime.toLocaleDateString('en-US', { weekday: 'long' });
  const date = gmtTime.toLocaleDateString('en-GB'); // DD/MM/YYYY format
  const time = gmtTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  
  return { date, time, day };
}

/**
 * Convert a timestamp to GMT +2 display format
 * Useful for displaying backend timestamps
 */
export function formatToGMT2(timestamp?: string): string {
  if (!timestamp) {
    return getGMT2Time();
  }
  
  try {
    const date = new Date(timestamp);
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
    const gmtTime = new Date(utcTime + (LUSAKA_TIMEZONE_OFFSET * 60 * 60 * 1000));
    
    const hours = String(gmtTime.getHours()).padStart(2, '0');
    const minutes = String(gmtTime.getMinutes()).padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch {
    return getGMT2Time();
  }
}
