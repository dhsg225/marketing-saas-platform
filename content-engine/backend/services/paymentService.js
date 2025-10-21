// [October 16, 2025] - Manual Payment Service with Escrow System
// Purpose: Handle manual payments, escrow, and automated payouts without Stripe
// Features: Payment tracking, escrow management, payout automation

const { pool } = require('../../database/config');
const emailService = require('./emailService');

class PaymentService {
  constructor() {
    this.escrowPeriod = 7; // Days to hold payment in escrow
    this.platformFeePercentage = 0.12; // 12% platform fee
    this.stripeFeePercentage = 0.029; // 2.9% + $0.30 (simulated)
  }

  /**
   * Calculate payment breakdown
   */
  calculatePaymentBreakdown(amount) {
    const platformFee = amount * this.platformFeePercentage;
    const stripeFee = (amount * this.stripeFeePercentage) + 0.30;
    const talentPayout = amount - platformFee - stripeFee;

    return {
      totalAmount: parseFloat(amount.toFixed(2)),
      platformFee: parseFloat(platformFee.toFixed(2)),
      stripeFee: parseFloat(stripeFee.toFixed(2)),
      talentPayout: parseFloat(talentPayout.toFixed(2)),
      platformFeePercentage: this.platformFeePercentage,
      stripeFeePercentage: this.stripeFeePercentage
    };
  }

  /**
   * Create manual payment record
   */
  async createManualPayment(bookingId, amount, paymentMethod, clientNotes) {
    try {
      const breakdown = this.calculatePaymentBreakdown(amount);
      
      const result = await pool.query(`
        INSERT INTO talent_payments (
          booking_id, payment_type, amount, platform_fee, stripe_fee, 
          talent_payout, payment_status, payment_method, client_notes,
          escrow_release_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING *
      `, [
        bookingId,
        'manual',
        breakdown.totalAmount,
        breakdown.platformFee,
        breakdown.stripeFee,
        breakdown.talentPayout,
        'pending_verification',
        paymentMethod,
        clientNotes,
        new Date(Date.now() + (this.escrowPeriod * 24 * 60 * 60 * 1000))
      ]);

      // Update booking with payment info
      await pool.query(`
        UPDATE talent_bookings 
        SET 
          total_price = $1,
          platform_fee_percentage = $2,
          platform_fee_amount = $3,
          stripe_fee_amount = $4,
          talent_payout_amount = $5,
          payment_status = 'pending_verification',
          updated_at = NOW()
        WHERE id = $6
      `, [
        breakdown.totalAmount,
        breakdown.platformFeePercentage,
        breakdown.platformFee,
        breakdown.stripeFee,
        breakdown.talentPayout,
        bookingId
      ]);

      // Send payment verification email
      await this.sendPaymentVerificationEmail(bookingId, result.rows[0]);

      return {
        success: true,
        data: result.rows[0],
        breakdown
      };
    } catch (error) {
      console.error('Error creating manual payment:', error);
      throw error;
    }
  }

  /**
   * Verify manual payment (admin action)
   */
  async verifyPayment(paymentId, adminUserId, verificationNotes) {
    try {
      const result = await pool.query(`
        UPDATE talent_payments 
        SET 
          payment_status = 'verified',
          verified_by = $1,
          verified_at = NOW(),
          verification_notes = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [adminUserId, verificationNotes, paymentId]);

      if (result.rows.length === 0) {
        throw new Error('Payment not found');
      }

      const payment = result.rows[0];
      
      // Update booking status
      await pool.query(`
        UPDATE talent_bookings 
        SET 
          payment_status = 'paid',
          status = 'confirmed',
          updated_at = NOW()
        WHERE id = $1
      `, [payment.booking_id]);

      // Send confirmation emails
      await this.sendPaymentConfirmationEmails(payment);

      return {
        success: true,
        data: payment
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      throw error;
    }
  }

  /**
   * Release escrow payment to talent
   */
  async releaseEscrowPayment(paymentId, releaseReason = 'delivery_completed') {
    try {
      const result = await pool.query(`
        UPDATE talent_payments 
        SET 
          payment_status = 'released',
          released_at = NOW(),
          release_reason = $1,
          updated_at = NOW()
        WHERE id = $2 AND payment_status = 'verified'
        RETURNING *
      `, [releaseReason, paymentId]);

      if (result.rows.length === 0) {
        throw new Error('Payment not found or not verified');
      }

      const payment = result.rows[0];

      // Update booking status
      await pool.query(`
        UPDATE talent_bookings 
        SET 
          payment_status = 'released',
          status = 'completed',
          completed_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [payment.booking_id]);

      // Create payout record
      await this.createPayoutRecord(payment);

      // Send payout notification
      await this.sendPayoutNotification(payment);

      return {
        success: true,
        data: payment
      };
    } catch (error) {
      console.error('Error releasing escrow payment:', error);
      throw error;
    }
  }

  /**
   * Create payout record for talent
   */
  async createPayoutRecord(payment) {
    try {
      const result = await pool.query(`
        INSERT INTO talent_payouts (
          payment_id, talent_profile_id, amount, payout_method, 
          payout_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING *
      `, [
        payment.id,
        payment.talent_profile_id,
        payment.talent_payout,
        'manual_transfer',
        'pending'
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating payout record:', error);
      throw error;
    }
  }

  /**
   * Process automated payouts (daily job)
   */
  async processAutomatedPayouts() {
    try {
      // Find payments ready for release
      const readyPayments = await pool.query(`
        SELECT tp.*, tb.talent_profile_id, tb.client_user_id
        FROM talent_payments tp
        JOIN talent_bookings tb ON tp.booking_id = tb.id
        WHERE tp.payment_status = 'verified'
          AND tp.escrow_release_date <= NOW()
          AND tb.status = 'confirmed'
      `);

      const results = [];
      for (const payment of readyPayments.rows) {
        try {
          const result = await this.releaseEscrowPayment(payment.id, 'automatic_release');
          results.push(result);
        } catch (error) {
          console.error(`Error processing payment ${payment.id}:`, error);
        }
      }

      return {
        success: true,
        processed: results.length,
        results
      };
    } catch (error) {
      console.error('Error processing automated payouts:', error);
      throw error;
    }
  }

  /**
   * Get payment status for booking
   */
  async getPaymentStatus(bookingId) {
    try {
      const result = await pool.query(`
        SELECT 
          tp.*,
          tb.status as booking_status,
          tb.total_price,
          tb.platform_fee_amount,
          tb.talent_payout_amount
        FROM talent_payments tp
        JOIN talent_bookings tb ON tp.booking_id = tb.id
        WHERE tp.booking_id = $1
        ORDER BY tp.created_at DESC
        LIMIT 1
      `, [bookingId]);

      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Get talent earnings summary
   */
  async getTalentEarnings(talentProfileId, startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_payouts,
          SUM(tp.talent_payout) as total_earnings,
          SUM(tp.platform_fee) as total_platform_fees,
          AVG(tp.talent_payout) as average_payout,
          COUNT(CASE WHEN tp.payment_status = 'released' THEN 1 END) as completed_payouts,
          COUNT(CASE WHEN tp.payment_status = 'verified' THEN 1 END) as pending_payouts
        FROM talent_payments tp
        JOIN talent_bookings tb ON tp.booking_id = tb.id
        WHERE tb.talent_profile_id = $1
          AND tp.created_at >= $2
          AND tp.created_at <= $3
      `, [talentProfileId, startDate, endDate]);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting talent earnings:', error);
      throw error;
    }
  }

  /**
   * Send payment verification email
   */
  async sendPaymentVerificationEmail(bookingId, payment) {
    try {
      // Get booking details
      const bookingResult = await pool.query(`
        SELECT tb.*, tp.display_name, tp.email as talent_email,
               cu.name as client_name, cu.email as client_email
        FROM talent_bookings tb
        JOIN talent_profiles tp ON tb.talent_profile_id = tp.id
        JOIN users cu ON tb.client_user_id = cu.id
        WHERE tb.id = $1
      `, [bookingId]);

      if (bookingResult.rows.length === 0) return;

      const booking = bookingResult.rows[0];

      // Email to admin for verification
      await emailService.sendEmail({
        to: 'admin@marketingplatform.com',
        subject: `Payment Verification Required - Booking ${bookingId}`,
        template: 'payment_verification',
        data: {
          bookingId,
          clientName: booking.client_name,
          talentName: booking.display_name,
          amount: payment.amount,
          paymentMethod: payment.payment_method,
          clientNotes: payment.client_notes
        }
      });

      // Email to client
      await emailService.sendEmail({
        to: booking.client_email,
        subject: `Payment Received - ${booking.display_name}`,
        template: 'payment_received',
        data: {
          bookingId,
          talentName: booking.display_name,
          amount: payment.amount,
          verificationStatus: 'pending'
        }
      });

    } catch (error) {
      console.error('Error sending payment verification email:', error);
    }
  }

  /**
   * Send payment confirmation emails
   */
  async sendPaymentConfirmationEmails(payment) {
    try {
      // Get booking details
      const bookingResult = await pool.query(`
        SELECT tb.*, tp.display_name, tp.email as talent_email,
               cu.name as client_name, cu.email as client_email
        FROM talent_bookings tb
        JOIN talent_profiles tp ON tb.talent_profile_id = tp.id
        JOIN users cu ON tb.client_user_id = cu.id
        WHERE tb.id = $1
      `, [payment.booking_id]);

      if (bookingResult.rows.length === 0) return;

      const booking = bookingResult.rows[0];

      // Email to talent
      await emailService.sendEmail({
        to: booking.talent_email,
        subject: `Payment Confirmed - ${booking.display_name}`,
        template: 'payment_confirmed_talent',
        data: {
          bookingId: payment.booking_id,
          amount: payment.talent_payout,
          escrowReleaseDate: payment.escrow_release_date
        }
      });

      // Email to client
      await emailService.sendEmail({
        to: booking.client_email,
        subject: `Payment Confirmed - ${booking.display_name}`,
        template: 'payment_confirmed_client',
        data: {
          bookingId: payment.booking_id,
          talentName: booking.display_name,
          amount: payment.amount
        }
      });

    } catch (error) {
      console.error('Error sending payment confirmation emails:', error);
    }
  }

  /**
   * Send payout notification
   */
  async sendPayoutNotification(payment) {
    try {
      // Get talent details
      const talentResult = await pool.query(`
        SELECT tp.display_name, tp.email
        FROM talent_profiles tp
        JOIN talent_bookings tb ON tp.id = tb.talent_profile_id
        WHERE tb.id = $1
      `, [payment.booking_id]);

      if (talentResult.rows.length === 0) return;

      const talent = talentResult.rows[0];

      await emailService.sendEmail({
        to: talent.email,
        subject: `Payout Released - $${payment.talent_payout}`,
        template: 'payout_released',
        data: {
          amount: payment.talent_payout,
          bookingId: payment.booking_id
        }
      });

    } catch (error) {
      console.error('Error sending payout notification:', error);
    }
  }
}

module.exports = new PaymentService();
