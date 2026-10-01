import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { emailService } from '../services/email';
import { pgPool } from '../config/db';

const sendTestSchema = z.object({
  to: z.string().email(),
  type: z.enum(['ORDER_CONFIRMATION', 'ORDER_FAILED', 'WELCOME', 'PASSWORD_RESET']),
});

// POST /api/email/send-test
export async function sendTestEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = sendTestSchema.safeParse(req.body);
    if (!parsed.success) throw new Error('Invalid email payload');

    const { to, type } = parsed.data;

    switch (type) {
      case 'ORDER_CONFIRMATION':
        await emailService.sendOrderConfirmation(to, 999, 1499.99);
        break;
      case 'ORDER_FAILED':
        await emailService.sendOrderFailure(to, 'Payment declined');
        break;
      case 'WELCOME':
        await emailService.sendWelcome(to, 'TestUser');
        break;
      case 'PASSWORD_RESET':
        await emailService.sendPasswordReset(to, 'reset_token_abc123');
        break;
    }

    res.json({
      success: true,
      message: `Test ${type} email sent to ${to} (dry-run mode)`,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/email/logs
export async function getEmailLogs(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await pgPool.query(
      `SELECT event_type, payload, processed_at
       FROM event_logs
       WHERE topic = 'email_notifications'
       ORDER BY processed_at DESC
       LIMIT 20`
    );

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}