import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment';
import { ApiError } from '../middlewares/errorHandler';

const createIntentSchema = z.object({
  amount: z.number().positive(),
  orderId: z.number().int().positive().optional(),
  simulateFailure: z.boolean().optional(),
});

const confirmIntentSchema = z.object({
  simulateFailure: z.boolean().optional(),
});

// POST /api/payments/create-intent
export function createIntent(req: Request, res: Response, next: NextFunction): void {
  try {
    const parsed = createIntentSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'amount is required');

    const userId = (req as any).user?.userId ?? 1;
    const { amount, orderId } = parsed.data;

    const intent = paymentService.createPaymentIntent(amount, userId, orderId ?? null);

    res.status(201).json({
      success: true,
      data: intent,
      explanation: 'Payment Intent created. In production, the client_secret would be sent to the frontend to render Stripe Elements.',
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/payments/:intentId/confirm
export function confirmIntent(req: Request, res: Response, next: NextFunction): void {
  try {
    const { intentId } = req.params;
    const parsed = confirmIntentSchema.safeParse(req.body);

    const simulateFailure = parsed.success ? parsed.data.simulateFailure : false;
    const intent = paymentService.confirmPaymentIntent(intentId, simulateFailure);

    res.json({
      success: intent.status === 'succeeded',
      data: intent,
      explanation: intent.status === 'succeeded'
        ? 'Payment confirmed successfully. Webhook event payment_intent.succeeded has been emitted.'
        : `Payment failed: ${intent.failureReason}. Webhook event payment_intent.failed has been emitted.`,
    });
  } catch (error) {
    next(error instanceof Error ? new ApiError(400, error.message) : error);
  }
}

// POST /api/payments/:intentId/refund
export function refundIntent(req: Request, res: Response, next: NextFunction): void {
  try {
    const { intentId } = req.params;
    const intent = paymentService.refundPaymentIntent(intentId);

    res.json({
      success: true,
      data: intent,
      explanation: 'Payment refunded. In a Saga pattern, this would trigger compensating transactions.',
    });
  } catch (error) {
    next(error instanceof Error ? new ApiError(400, error.message) : error);
  }
}

// GET /api/payments/webhooks
export function getWebhooks(_req: Request, res: Response, _next: NextFunction): void {
  const events = paymentService.getWebhookEvents(20);
  res.json({ success: true, data: events });
}

// GET /api/payments/intents
export function getAllIntents(_req: Request, res: Response, _next: NextFunction): void {
  const intents = paymentService.getAllIntents();
  res.json({ success: true, data: intents });
}