import { Router } from 'express';
import express from 'express';
import Stripe from 'stripe';
import { env } from '../config/env';
import {
  createIntent,
  confirmIntent,
  refundIntent,
  getPaymentStatus,
} from '../controllers/payment.controller';

const router = Router();

// ==========================================
// Stripe Webhook (must be BEFORE other routes)
// Uses express.raw() because Stripe needs the raw body for signature verification
// ==========================================
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!env.STRIPE_SECRET_KEY) {
    return res.status(400).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' as any });
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      env.STRIPE_WEBHOOK_SECRET || ''
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('✅ [Stripe Webhook] Payment succeeded:', event.data.object.id);
        break;
      case 'payment_intent.payment_failed':
        console.log('❌ [Stripe Webhook] Payment failed:', event.data.object.id);
        break;
      default:
        console.log(`🔔 [Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

// ==========================================
// Payment Routes
// ==========================================
router.get('/status', getPaymentStatus);
router.post('/create-intent', createIntent);
router.post('/:intentId/confirm', confirmIntent);
router.post('/:intentId/refund', refundIntent);

export default router;