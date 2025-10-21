import { timezoneManager } from './timezone';

/**
 * Unified date normalization utility for calendar views
 * Ensures consistent date handling across 7-day, 30-day, and monthly views
 */

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Convert ISO date string to calendar date key (YYYY-MM-DD) using timezone-aware conversion
 * This replaces all ad-hoc date extraction and ensures consistency
 */
export function dateKeyForCalendar(isoDateString: string | null | undefined, userTimezone?: string): string {
  if (!isoDateString) {
    return new Date().toISOString().slice(0, 10); // fallback to today
  }
  
  try {
    // Use existing timezoneManager for consistent conversion
    const localDate = timezoneManager.convertUTCToLocal(isoDateString);
    return localDate.slice(0, 10); // YYYY-MM-DD
  } catch (error) {
    console.warn('Date conversion error:', error, 'for date:', isoDateString);
    // Fallback to direct ISO string parsing
    return new Date(isoDateString).toISOString().slice(0, 10);
  }
}

/**
 * Get date range for different calendar views
 * Centralized logic to ensure consistency between views
 */
export function getDateRangeForView(view: string, weekStart?: Date): DateRange {
  const now = new Date();
  
  switch (view) {
    case '1-day':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      };
      
    case '7-day':
      const startOfWeek = weekStart || (() => {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay()); // Start from Sunday
        return start;
      })();
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      
      return {
        start: startOfWeek,
        end: endOfWeek
      };
      
    case 'monthly':
    case '30-day':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      return {
        start: startOfMonth,
        end: endOfMonth
      };
      
    case 'quarterly':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59);
      
      return {
        start: startOfQuarter,
        end: endOfQuarter
      };
      
    default:
      return {
        start: now,
        end: now
      };
  }
}

/**
 * Check if a date falls within a given range
 * Uses timezone-aware comparison
 */
export function isDateInRange(isoDateString: string, range: DateRange): boolean {
  if (!isoDateString) return false;
  
  try {
    const itemDate = new Date(isoDateString);
    return itemDate >= range.start && itemDate <= range.end;
  } catch (error) {
    console.warn('Date range check error:', error, 'for date:', isoDateString);
    return false;
  }
}

/**
 * Format date range for display in calendar headers
 */
export function formatDateRange(start: Date, end: Date): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  const startStr = formatDate(start);
  const endStr = formatDate(end);
  
  // For weekly view, add week number
  if (start.getTime() !== end.getTime()) {
    const weekNumber = Math.ceil((start.getDate() + new Date(start.getFullYear(), start.getMonth(), 1).getDay()) / 7);
    return `${startStr} – ${endStr} (Week ${weekNumber})`;
  }
  
  return `${startStr} – ${endStr}`;
}

/**
 * Get calendar date key for grouping content by date
 * This is the single source of truth for date grouping
 */
export function getCalendarDateKey(isoDateString: string | null | undefined): string {
  return dateKeyForCalendar(isoDateString);
}
