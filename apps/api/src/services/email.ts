import { pgPool } from '../config/db';

/**
 * Email Service (Nodemailer Simulation)
 * 
 * In production, this would use Nodemailer with Mailtrap/SES/SendGrid.
 * This simulation logs emails to the database for demonstration.
 * 
 * Architecture:
 * 1. Kafka Consumer receives event
 * 2. Email Service generates template
 * 3. Email is "sent" (logged to DB in simulation mode)
 */

export interface EmailRecord {
  to: string;
  subject: string;
  body: string;
  type: 'ORDER_CONFIRMATION' | 'ORDER_FAILED' | 'PASSWORD_RESET' | 'WELCOME';
  sentAt: string;
  status: 'SENT' | 'FAILED';
}

export class EmailService {
  private dryRun: boolean;

  constructor(dryRun: boolean = true) {
    this.dryRun = dryRun;
  }

  /**
   * Send an email (or log it in dry-run mode)
   */
  async sendEmail(record: EmailRecord): Promise<boolean> {
    if (this.dryRun) {
      console.log(`📧 [DRY RUN] Email to: ${record.to}`);
      console.log(`   Subject: ${record.subject}`);
      console.log(`   Type: ${record.type}`);
    } else {
      // In production, this would call nodemailer:
      // await transporter.sendMail({ from, to, subject, html });
      console.log(`📧 [SENT] Email to: ${record.to}`);
    }

    // Log to database for tracking
    try {
      await pgPool.query(
        `INSERT INTO event_logs (topic, event_type, payload, processed_by)
         VALUES ($1, $2, $3, $4)`,
        [
          'email_notifications',
          record.type,
          JSON.stringify(record),
          'EmailService',
        ]
      );
    } catch {
      // Email logging failure should not break the flow
    }

    return true;
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(to: string, orderId: number, totalAmount: number): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Order #${orderId} Confirmed - ForkSquare`,
      body: `Your order #${orderId} has been confirmed! Total: Rs. ${totalAmount.toFixed(2)}. Your food is being prepared.`,
      type: 'ORDER_CONFIRMATION',
      sentAt: new Date().toISOString(),
      status: 'SENT',
    });
  }

  /**
   * Send order failure email
   */
  async sendOrderFailure(to: string, reason: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Order Failed - ForkSquare',
      body: `We're sorry, your order could not be processed. Reason: ${reason}`,
      type: 'ORDER_FAILED',
      sentAt: new Date().toISOString(),
      status: 'SENT',
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcome(to: string, username: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: `Welcome to ForkSquare, ${username}!`,
      body: `Hi ${username}, welcome to ForkSquare! Start exploring restaurants near you.`,
      type: 'WELCOME',
      sentAt: new Date().toISOString(),
      status: 'SENT',
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, resetToken: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'Password Reset - ForkSquare',
      body: `Click the link to reset your password: https://forksquare.app/reset?token=${resetToken}`,
      type: 'PASSWORD_RESET',
      sentAt: new Date().toISOString(),
      status: 'SENT',
    });
  }
}

// Global email service (dry-run mode for demo)
export const emailService = new EmailService(true);