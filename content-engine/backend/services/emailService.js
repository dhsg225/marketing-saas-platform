// [October 15, 2025] - Email Notification Service
// Purpose: Send booking notifications, reminders, etc.
// Note: Scaffolded for SendGrid - will integrate in production

class EmailService {
  constructor() {
    this.sendGridApiKey = process.env.SENDGRID_API_KEY;
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@marketingsaas.com';
    
    if (!this.sendGridApiKey) {
      console.warn('⚠️ SENDGRID_API_KEY not found - Email features disabled');
      console.warn('ℹ️ Email notifications will be logged to console');
    }
  }

  // ==================== BOOKING NOTIFICATIONS ====================

  /**
   * Send booking request notification to talent
   */
  async sendBookingRequestNotification(booking, talentEmail) {
    console.log('📧 [EMAIL STUB] Sending booking request notification');
    console.log('   To:', talentEmail);
    console.log('   Subject: New Booking Request');
    console.log('   Booking:', booking.booking_number, '-', booking.title);
    console.log('   Date:', booking.requested_date);
    console.log('   Price:', booking.quoted_price);
    
    // TODO: Implement SendGrid in Week 3
    return { success: true, message: 'Email logged (not sent - SendGrid not configured)' };
  }

  /**
   * Send booking accepted notification to client
   */
  async sendBookingAcceptedNotification(booking, clientEmail) {
    console.log('📧 [EMAIL STUB] Sending booking accepted notification');
    console.log('   To:', clientEmail);
    console.log('   Subject: Booking Accepted!');
    console.log('   Booking:', booking.booking_number);
    
    return { success: true, message: 'Email logged' };
  }

  /**
   * Send booking declined notification to client
   */
  async sendBookingDeclinedNotification(booking, clientEmail, reason) {
    console.log('📧 [EMAIL STUB] Sending booking declined notification');
    console.log('   To:', clientEmail);
    console.log('   Subject: Booking Declined');
    console.log('   Booking:', booking.booking_number);
    console.log('   Reason:', reason);
    
    return { success: true, message: 'Email logged' };
  }

  /**
   * Send deliverables ready notification to client
   */
  async sendDeliverablesReadyNotification(booking, clientEmail) {
    console.log('📧 [EMAIL STUB] Sending deliverables ready notification');
    console.log('   To:', clientEmail);
    console.log('   Subject: Deliverables Ready for Review');
    console.log('   Booking:', booking.booking_number);
    
    return { success: true, message: 'Email logged' };
  }

  /**
   * Send booking completed notification to talent
   */
  async sendBookingCompletedNotification(booking, talentEmail) {
    console.log('📧 [EMAIL STUB] Sending booking completed notification');
    console.log('   To:', talentEmail);
    console.log('   Subject: Booking Completed - Payment Processing');
    console.log('   Booking:', booking.booking_number);
    console.log('   Payout:', booking.talent_payout_amount);
    
    return { success: true, message: 'Email logged' };
  }

  /**
   * Send reminder notification (1 day before booking)
   */
  async sendBookingReminderNotification(booking, recipientEmail) {
    console.log('📧 [EMAIL STUB] Sending booking reminder');
    console.log('   To:', recipientEmail);
    console.log('   Subject: Booking Reminder - Tomorrow');
    console.log('   Booking:', booking.booking_number);
    console.log('   Date:', booking.requested_date);
    
    return { success: true, message: 'Email logged' };
  }

  // ==================== PROFILE NOTIFICATIONS ====================

  /**
   * Send profile approved notification to talent
   */
  async sendProfileApprovedNotification(talentEmail, profileName) {
    console.log('📧 [EMAIL STUB] Sending profile approved notification');
    console.log('   To:', talentEmail);
    console.log('   Subject: Your Talent Profile Has Been Approved!');
    console.log('   Profile:', profileName);
    
    return { success: true, message: 'Email logged' };
  }

  /**
   * Send profile suspended notification to talent
   */
  async sendProfileSuspendedNotification(talentEmail, reason) {
    console.log('📧 [EMAIL STUB] Sending profile suspended notification');
    console.log('   To:', talentEmail);
    console.log('   Subject: Your Profile Has Been Suspended');
    console.log('   Reason:', reason);
    
    return { success: true, message: 'Email logged' };
  }

  // ==================== ADMIN NOTIFICATIONS ====================

  /**
   * Send new talent application notification to admin
   */
  async sendNewTalentApplicationNotification(adminEmail, talentProfile) {
    console.log('📧 [EMAIL STUB] Sending new talent application to admin');
    console.log('   To:', adminEmail);
    console.log('   Subject: New Talent Application');
    console.log('   Talent:', talentProfile.display_name);
    console.log('   Type:', talentProfile.talent_type);
    
    return { success: true, message: 'Email logged' };
  }

  /**
   * Send new booking notification to admin
   */
  async sendNewBookingNotificationToAdmin(adminEmail, booking) {
    console.log('📧 [EMAIL STUB] Sending new booking notification to admin');
    console.log('   To:', adminEmail);
    console.log('   Subject: New Booking Created');
    console.log('   Booking:', booking.booking_number);
    console.log('   Amount:', booking.quoted_price);
    
    return { success: true, message: 'Email logged' };
  }

  // ==================== SENDGRID IMPLEMENTATION (Week 3) ====================

  /**
   * Send email via SendGrid
   * @future Week 3 implementation
   */
  async sendEmailViaSendGrid(to, subject, htmlContent, textContent) {
    if (!this.sendGridApiKey) {
      console.log('📧 [EMAIL STUB] Would send via SendGrid:');
      console.log('   To:', to);
      console.log('   Subject:', subject);
      return { success: true, message: 'SendGrid not configured' };
    }

    // TODO: Implement SendGrid API call
    /*
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.sendGridApiKey);
    
    const msg = {
      to: to,
      from: this.fromEmail,
      subject: subject,
      text: textContent,
      html: htmlContent
    };
    
    await sgMail.send(msg);
    */

    return { success: true, message: 'Email sent (stub)' };
  }

  /**
   * Test email connection
   */
  async testConnection() {
    if (!this.sendGridApiKey) {
      return { connected: false, message: 'SendGrid API key not configured' };
    }

    // TODO: Test SendGrid connection
    return { connected: false, message: 'SendGrid integration pending (Week 3)' };
  }
}

module.exports = new EmailService();

