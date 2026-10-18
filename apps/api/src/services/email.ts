// import { pgPool } from '../config/db';

// /**
//  * Email Service (Nodemailer Simulation)
//  * 
//  * In production, this would use Nodemailer with Mailtrap/SES/SendGrid.
//  * This simulation logs emails to the database for demonstration.
//  * 
//  * Architecture:
//  * 1. Kafka Consumer receives event
//  * 2. Email Service generates template
//  * 3. Email is "sent" (logged to DB in simulation mode)
//  */

// export interface EmailRecord {
//   to: string;
//   subject: string;
//   body: string;
//   type: 'ORDER_CONFIRMATION' | 'ORDER_FAILED' | 'PASSWORD_RESET' | 'WELCOME';
//   sentAt: string;
//   status: 'SENT' | 'FAILED';
// }

// export class EmailService {
//   private dryRun: boolean;

//   constructor(dryRun: boolean = true) {
//     this.dryRun = dryRun;
//   }

//   /**
//    * Send an email (or log it in dry-run mode)
//    */
//   async sendEmail(record: EmailRecord): Promise<boolean> {
//     if (this.dryRun) {
//       console.log(`📧 [DRY RUN] Email to: ${record.to}`);
//       console.log(`   Subject: ${record.subject}`);
//       console.log(`   Type: ${record.type}`);
//     } else {
//       // In production, this would call nodemailer:
//       // await transporter.sendMail({ from, to, subject, html });
//       console.log(`📧 [SENT] Email to: ${record.to}`);
//     }

//     // Log to database for tracking
//     try {
//       await pgPool.query(
//         `INSERT INTO event_logs (topic, event_type, payload, processed_by)
//          VALUES ($1, $2, $3, $4)`,
//         [
//           'email_notifications',
//           record.type,
//           JSON.stringify(record),
//           'EmailService',
//         ]
//       );
//     } catch {
//       // Email logging failure should not break the flow
//     }

//     return true;
//   }

//   /**
//    * Send order confirmation email
//    */
//   async sendOrderConfirmation(to: string, orderId: number, totalAmount: number): Promise<boolean> {
//     return this.sendEmail({
//       to,
//       subject: `Order #${orderId} Confirmed - ForkSquare`,
//       body: `Your order #${orderId} has been confirmed! Total: Rs. ${totalAmount.toFixed(2)}. Your food is being prepared.`,
//       type: 'ORDER_CONFIRMATION',
//       sentAt: new Date().toISOString(),
//       status: 'SENT',
//     });
//   }

//   /**
//    * Send order failure email
//    */
//   async sendOrderFailure(to: string, reason: string): Promise<boolean> {
//     return this.sendEmail({
//       to,
//       subject: 'Order Failed - ForkSquare',
//       body: `We're sorry, your order could not be processed. Reason: ${reason}`,
//       type: 'ORDER_FAILED',
//       sentAt: new Date().toISOString(),
//       status: 'SENT',
//     });
//   }

//   /**
//    * Send welcome email
//    */
//   async sendWelcome(to: string, username: string): Promise<boolean> {
//     return this.sendEmail({
//       to,
//       subject: `Welcome to ForkSquare, ${username}!`,
//       body: `Hi ${username}, welcome to ForkSquare! Start exploring restaurants near you.`,
//       type: 'WELCOME',
//       sentAt: new Date().toISOString(),
//       status: 'SENT',
//     });
//   }

//   /**
//    * Send password reset email
//    */
//   async sendPasswordReset(to: string, resetToken: string): Promise<boolean> {
//     return this.sendEmail({
//       to,
//       subject: 'Password Reset - ForkSquare',
//       body: `Click the link to reset your password: https://forksquare.app/reset?token=${resetToken}`,
//       type: 'PASSWORD_RESET',
//       sentAt: new Date().toISOString(),
//       status: 'SENT',
//     });
//   }
// }

// // Global email service (dry-run mode for demo)
// export const emailService = new EmailService(true);








import nodemailer from 'nodemailer';
import { env } from '../config/env';
import logger from '../config/logger';
import { pgPool } from '../config/db';
import type { Transporter } from "nodemailer";

/**
 * Email Service — Real Nodemailer + Mailtrap
 *
 * Auto-detects SMTP credentials:
 * - YES → sends real emails to your Mailtrap inbox
 * - NO  → falls back to console.log (dry-run)
 */

class EmailService {
  // private transporter: nodemailer.Transporter | null = null;
  private transporter: Transporter | null = null;
  private isRealMode = false;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT || 2525,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      this.isRealMode = true;
      logger.info(`📧 Email service initialized (SMTP: ${env.SMTP_HOST})`);
    } else {
      logger.warn('⚠️  SMTP not configured. Email service running in DRY-RUN mode.');
    }
  }

  private async logEmail(record: any): Promise<void> {
    try {
      await pgPool.query(
        `INSERT INTO event_logs (topic, event_type, payload, processed_by)
         VALUES ($1, $2, $3, $4)`,
        ['email_notifications', record.type, JSON.stringify(record), 'EmailService']
      );
    } catch (err) {
      logger.error('Failed to log email to DB', err);
    }
  }

  async sendEmail(to: string, subject: string, html: string, type: string): Promise<boolean> {
    const record = { to, subject, html, type, sentAt: new Date().toISOString(), mode: this.isRealMode ? 'REAL' : 'DRY-RUN' };

    if (this.isRealMode && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: env.EMAIL_FROM || 'noreply@forksquare.app',
          to,
          subject,
          html,
        });
        logger.info(`📧 [REAL] Email sent to ${to}: ${subject}`);
      } catch (err) {
        logger.error(`📧 [REAL] Failed to send email:`, err);
        return false;
      }
    } else {
      logger.info(`📧 [DRY-RUN] Email to: ${to} | Subject: ${subject}`);
    }

    await this.logEmail(record);
    return true;
  }

  async sendOrderConfirmation(to: string, orderId: number, totalAmount: number): Promise<boolean> {
    const html = `
      <h1>Order #${orderId} Confirmed 🎉</h1>
      <p>Your order has been confirmed!</p>
      <p><strong>Total:</strong> Rs. ${totalAmount.toFixed(2)}</p>
      <p>Your food is being prepared. Track your order in the app.</p>
    `;
    return this.sendEmail(to, `Order #${orderId} Confirmed - ForkSquare`, html, 'ORDER_CONFIRMATION');
  }

  async sendOrderFailure(to: string, reason: string): Promise<boolean> {
    const html = `
      <h1>Order Failed 😔</h1>
      <p>We're sorry, your order could not be processed.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please try again or contact support.</p>
    `;
    return this.sendEmail(to, 'Order Failed - ForkSquare', html, 'ORDER_FAILED');
  }

  async sendWelcome(to: string, username: string): Promise<boolean> {
    const html = `
      <h1>Welcome to ForkSquare, ${username}! 👋</h1>
      <p>Start exploring restaurants near you and order your favorite food.</p>
    `;
    return this.sendEmail(to, `Welcome to ForkSquare, ${username}!`, html, 'WELCOME');
  }

  async sendPasswordReset(to: string, resetToken: string): Promise<boolean> {
    const html = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="https://forksquare.app/reset?token=${resetToken}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
    `;
    return this.sendEmail(to, 'Password Reset - ForkSquare', html, 'PASSWORD_RESET');
  }

  isReal(): boolean {
    return this.isRealMode;
  }
}

export const emailService = new EmailService();