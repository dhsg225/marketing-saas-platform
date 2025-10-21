/**
 * Frontend Timezone Utilities
 * Handles timezone conversion and date formatting for the frontend
 */

export class FrontendTimezoneManager {
  private static instance: FrontendTimezoneManager;
  private userTimezone: string = 'Asia/Bangkok';

  private constructor() {
    // Get user's timezone from localStorage or use default
    const storedTimezone = localStorage.getItem('user_timezone');
    if (storedTimezone) {
      this.userTimezone = storedTimezone;
    }
  }

  public static getInstance(): FrontendTimezoneManager {
    if (!FrontendTimezoneManager.instance) {
      FrontendTimezoneManager.instance = new FrontendTimezoneManager();
    }
    return FrontendTimezoneManager.instance;
  }

  /**
   * Set user's timezone preference
   */
  public setUserTimezone(timezone: string): void {
    this.userTimezone = timezone;
    localStorage.setItem('user_timezone', timezone);
  }

  /**
   * Get user's timezone preference
   */
  public getUserTimezone(): string {
    return this.userTimezone;
  }

  /**
   * Convert UTC date to local timezone for display
   */
  public convertUTCToLocal(utcDate: string | Date): string {
    if (!utcDate) return '';
    
    try {
      const date = new Date(utcDate);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date provided to convertUTCToLocal:', utcDate);
        return '';
      }
      
      // Format as YYYY-MM-DD in local timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error converting UTC to local:', error);
      return '';
    }
  }

  /**
   * Convert local date to UTC for storage
   */
  public convertLocalToUTC(localDate: string, localTime?: string): string {
    if (!localDate) return '';
    
    try {
      // Combine date and time
      const dateTimeString = localTime ? `${localDate} ${localTime}` : `${localDate} 00:00:00`;
      
      // Create date object in local timezone
      const localDateObj = new Date(dateTimeString);
      
      if (isNaN(localDateObj.getTime())) {
        console.warn('Invalid date provided to convertLocalToUTC:', localDate, localTime);
        return '';
      }
      
      // Return ISO string (which is in UTC)
      return localDateObj.toISOString();
    } catch (error) {
      console.error('Error converting local to UTC:', error);
      return '';
    }
  }

  /**
   * Format date for display with timezone info
   */
  public formatDateForDisplay(date: string | Date, includeTime: boolean = false): string {
    if (!date) return '';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date provided to formatDateForDisplay:', date);
        return '';
      }
      
      if (includeTime) {
        return dateObj.toLocaleString('en-US', {
          timeZone: this.userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } else {
        return dateObj.toLocaleDateString('en-US', {
          timeZone: this.userTimezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
      }
    } catch (error) {
      console.error('Error formatting date for display:', error);
      return '';
    }
  }

  /**
   * Get timezone offset info
   */
  public getTimezoneInfo(): { timezone: string; offset: string; isDST: boolean } {
    try {
      const now = new Date();
      const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
      const local = new Date(utc.toLocaleString('en-US', { timeZone: this.userTimezone }));
      const offset = (local.getTime() - utc.getTime()) / (1000 * 60 * 60);
      
      return {
        timezone: this.userTimezone,
        offset: offset >= 0 ? `+${offset}` : `${offset}`,
        isDST: false // Simplified - in production, use a proper DST library
      };
    } catch (error) {
      console.error('Error getting timezone info:', error);
      return {
        timezone: this.userTimezone,
        offset: '+7',
        isDST: false
      };
    }
  }

  /**
   * Validate if a date is in the past
   */
  public isDateInPast(date: string): boolean {
    if (!date) return false;
    
    try {
      const inputDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      
      return inputDate < today;
    } catch (error) {
      console.error('Error checking if date is in past:', error);
      return false;
    }
  }

  /**
   * Get current date in YYYY-MM-DD format
   */
  public getCurrentDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse date string and return Date object
   */
  public parseDate(dateString: string): Date | null {
    if (!dateString) return null;
    
    try {
      // Handle different date formats
      let date: Date;
      
      if (dateString.includes('T')) {
        // ISO string
        date = new Date(dateString);
      } else if (dateString.includes('/')) {
        // MM/DD/YYYY format
        const parts = dateString.split('/');
        if (parts.length === 3) {
          date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
        } else {
          return null;
        }
      } else if (dateString.includes('-')) {
        // YYYY-MM-DD format
        date = new Date(dateString + 'T00:00:00');
      } else {
        return null;
      }
      
      if (isNaN(date.getTime())) {
        return null;
      }
      
      return date;
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  }
}

// Export singleton instance
export const timezoneManager = FrontendTimezoneManager.getInstance();

// Export common timezones
export const COMMON_TIMEZONES = [
  { value: 'Asia/Bangkok', label: 'Asia/Bangkok (UTC+7)', offset: '+07:00' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (UTC+8)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (UTC+9)', offset: '+09:00' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (UTC+8)', offset: '+08:00' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong Kong (UTC+8)', offset: '+08:00' },
  { value: 'Europe/London', label: 'Europe/London (UTC+0/+1)', offset: '+00:00/+01:00' },
  { value: 'Europe/Paris', label: 'Europe/Paris (UTC+1/+2)', offset: '+01:00/+02:00' },
  { value: 'America/New_York', label: 'America/New York (UTC-5/-4)', offset: '-05:00/-04:00' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (UTC-8/-7)', offset: '-08:00/-07:00' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (UTC+10/+11)', offset: '+10:00/+11:00' },
  { value: 'UTC', label: 'UTC (UTC+0)', offset: '+00:00' }
];
