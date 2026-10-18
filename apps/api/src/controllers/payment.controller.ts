import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment';
import { ApiError } from '../middlewares/errorHandler';

const createIntentSchema = z.object({
  amount: z.number().positive(),
  orderId: z.number().int().positive().optional(),
});

const confirmIntentSchema = z.object({
  simulateFailure: z.boolean().optional(),
});

// ==========================================
// POST /api/payments/create-intent
// ==========================================
export async function createIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createIntentSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'amount is required');

    const userId = (req as any).user?.userId ?? 1;
    const { amount, orderId } = parsed.data;

    const intent = await paymentService.createPaymentIntent(amount, userId, orderId ?? null);

    res.status(201).json({
      success: true,
      data: intent,
      mode: paymentService.isReal() ? 'STRIPE_TEST_MODE' : 'SIMULATION',
      explanation: paymentService.isReal()
        ? 'Real Stripe Payment Intent created in test mode. Use the client_secret with Stripe.js to complete payment.'
        : 'Simulated Payment Intent created (Stripe not configured).',
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/payments/:intentId/confirm
// ==========================================
export async function confirmIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const { intentId } = req.params;
    const parsed = confirmIntentSchema.safeParse(req.body);

    const simulateFailure = parsed.success ? parsed.data.simulateFailure : false;

    // ✅ await the async method
    const intent = await paymentService.confirmPaymentIntent(intentId, simulateFailure);

    res.json({
      success: intent.status === 'succeeded',
      data: intent,
      mode: paymentService.isReal() ? 'STRIPE_TEST_MODE' : 'SIMULATION',
      explanation: intent.status === 'succeeded'
        ? 'Payment confirmed successfully.'
        : 'Payment failed or was cancelled.',
    });
  } catch (error) {
    next(error instanceof Error ? new ApiError(400, error.message) : error);
  }
}

// ==========================================
// POST /api/payments/:intentId/refund
// ==========================================
export async function refundIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const { intentId } = req.params;

    // ✅ await the async method
    const intent = await paymentService.refundPaymentIntent(intentId);

    res.json({
      success: true,
      data: intent,
      mode: paymentService.isReal() ? 'STRIPE_TEST_MODE' : 'SIMULATION',
      explanation: 'Payment refunded successfully.',
    });
  } catch (error) {
    next(error instanceof Error ? new ApiError(400, error.message) : error);
  }
}

// ==========================================
// GET /api/payments/status
// Shows whether Stripe is real or simulated
// ==========================================
export function getPaymentStatus(_req: Request, res: Response, _next: NextFunction) {
  res.json({
    success: true,
    data: {
      mode: paymentService.isReal() ? 'STRIPE_TEST_MODE' : 'SIMULATION',
      isReal: paymentService.isReal(),
    },
    explanation: paymentService.isReal()
      ? 'Stripe is configured and running in TEST MODE. All payments use fake test cards (pm_card_visa).'
      : 'Stripe is NOT configured. Payment service is running in simulation mode. Set STRIPE_SECRET_KEY in .env to enable real Stripe.',
  });
}