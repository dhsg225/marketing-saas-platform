const moment = require('moment-timezone');

/**
 * Timezone Management Utilities
 * Handles all timezone conversions and management for the content system
 */

class TimezoneManager {
  constructor() {
    this.defaultTimezone = 'Asia/Bangkok';
    this.storageTimezone = 'UTC';
  }

  /**
   * Get system default timezone from database
   */
  async getSystemDefaultTimezone() {
    try {
      const { query } = require('../database/config');
      const result = await query(
        'SELECT setting_value FROM system_settings WHERE setting_key = $1',
        ['system_default_timezone']
      );
      return result.rows[0]?.setting_value || this.defaultTimezone;
    } catch (error) {
      console.warn('⚠️ Could not fetch system timezone, using default:', error.message);
      return this.defaultTimezone;
    }
  }

  /**
   * Get user's timezone preference
   */
  async getUserTimezone(userId) {
    try {
      const { query } = require('../database/config');
      const result = await query(
        'SELECT timezone_preference, timezone_source FROM users WHERE id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) {
        return await this.getSystemDefaultTimezone();
      }
      
      const user = result.rows[0];
      if (user.timezone_source === 'system') {
        return await this.getSystemDefaultTimezone();
      }
      
      return user.timezone_preference || await this.getSystemDefaultTimezone();
    } catch (error) {
      console.warn('⚠️ Could not fetch user timezone, using system default:', error.message);
      return await this.getSystemDefaultTimezone();
    }
  }

  /**
   * Convert local time to UTC for storage
   */
  convertToUTC(localTime, timezone = this.defaultTimezone) {
    if (!localTime) return null;
    
    try {
      // Handle different input formats
      let momentTime;
      if (typeof localTime === 'string') {
        // If it's just a date (YYYY-MM-DD), treat as midnight in the timezone
        if (localTime.match(/^\d{4}-\d{2}-\d{2}$/)) {
          momentTime = moment.tz(localTime + ' 00:00:00', timezone);
        } else {
          momentTime = moment.tz(localTime, timezone);
        }
      } else {
        momentTime = moment.tz(localTime, timezone);
      }
      
      if (!momentTime.isValid()) {
        throw new Error(`Invalid time format: ${localTime}`);
      }
      
      return momentTime.utc().toISOString();
    } catch (error) {
      console.error('❌ Error converting to UTC:', error.message);
      throw new Error(`Failed to convert ${localTime} from ${timezone} to UTC: ${error.message}`);
    }
  }

  /**
   * Convert UTC time to local timezone for display
   */
  convertToLocal(utcTime, timezone = this.defaultTimezone) {
    if (!utcTime) return null;
    
    try {
      const momentTime = moment.utc(utcTime);
      if (!momentTime.isValid()) {
        throw new Error(`Invalid UTC time format: ${utcTime}`);
      }
      
      return momentTime.tz(timezone).format('YYYY-MM-DD HH:mm:ss');
    } catch (error) {
      console.error('❌ Error converting to local time:', error.message);
      throw new Error(`Failed to convert ${utcTime} from UTC to ${timezone}: ${error.message}`);
    }
  }

  /**
   * Format time for display with timezone info
   */
  formatDisplayTime(time, timezone = this.defaultTimezone, format = 'YYYY-MM-DD HH:mm') {
    if (!time) return null;
    
    try {
      const momentTime = moment.utc(time).tz(timezone);
      if (!momentTime.isValid()) {
        throw new Error(`Invalid time format: ${time}`);
      }
      
      return {
        formatted: momentTime.format(format),
        timezone: timezone,
        utc: moment.utc(time).format('YYYY-MM-DD HH:mm:ss') + ' UTC',
        local: momentTime.format('YYYY-MM-DD HH:mm:ss')
      };
    } catch (error) {
      console.error('❌ Error formatting display time:', error.message);
      return {
        formatted: 'Invalid time',
        timezone: timezone,
        utc: 'Invalid UTC',
        local: 'Invalid local'
      };
    }
  }

  /**
   * Get timezone offset info
   */
  getTimezoneInfo(timezone = this.defaultTimezone) {
    try {
      const now = moment.tz(timezone);
      return {
        timezone: timezone,
        offset: now.format('Z'),
        offsetMinutes: now.utcOffset(),
        isDST: now.isDST(),
        currentTime: now.format('YYYY-MM-DD HH:mm:ss')
      };
    } catch (error) {
      console.error('❌ Error getting timezone info:', error.message);
      return {
        timezone: timezone,
        offset: 'Unknown',
        offsetMinutes: 0,
        isDST: false,
        currentTime: 'Unknown'
      };
    }
  }

  /**
   * Validate timezone string
   */
  isValidTimezone(timezone) {
    try {
      return moment.tz.zone(timezone) !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of common timezones
   */
  getCommonTimezones() {
    return [
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
  }

  /**
   * Log timezone conversion for debugging
   */
  async logConversion(userId, contentId, contentType, originalTime, originalTimezone, convertedTime, convertedTimezone, direction) {
    try {
      const { query } = require('../database/config');
      await query(`
        INSERT INTO timezone_conversions 
        (user_id, content_id, content_type, original_time, original_timezone, converted_time, converted_timezone, conversion_direction)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [userId, contentId, contentType, originalTime, originalTimezone, convertedTime, convertedTimezone, direction]);
    } catch (error) {
      console.warn('⚠️ Could not log timezone conversion:', error.message);
    }
  }

  /**
   * Process content scheduling with timezone conversion
   */
  async processScheduling(userId, contentData) {
    try {
      const userTimezone = await this.getUserTimezone(userId);
      
      // Convert scheduled_date and scheduled_time to UTC
      if (contentData.scheduled_date || contentData.suggested_date) {
        const date = contentData.scheduled_date || contentData.suggested_date;
        const time = contentData.scheduled_time || contentData.suggested_time || '00:00:00';
        
        // Combine date and time
        const localDateTime = `${date} ${time}`;
        const utcDateTime = this.convertToUTC(localDateTime, userTimezone);
        
        // Log the conversion
        await this.logConversion(
          userId,
          contentData.id,
          'content_idea',
          localDateTime,
          userTimezone,
          utcDateTime,
          'UTC',
          'to_utc'
        );
        
        return {
          ...contentData,
          scheduled_at_utc: utcDateTime,
          scheduled_timezone: userTimezone,
          scheduled_date: date,
          scheduled_time: time
        };
      }
      
      return contentData;
    } catch (error) {
      console.error('❌ Error processing scheduling:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const timezoneManager = new TimezoneManager();

module.exports = {
  timezoneManager,
  TimezoneManager
};
