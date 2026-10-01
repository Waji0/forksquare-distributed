import crypto from 'crypto';

/**
 * Payment Service (Stripe-like Simulation)
 * 
 * Mirrors Stripe's Payment Intent API structure:
 * 1. Create Payment Intent → returns client_secret
 * 2. Confirm Payment Intent → processes the charge
 * 3. Webhook → notifies the system of payment events
 * 
 * In production, this would call the real Stripe API.
 * This simulation demonstrates the architecture without API keys.
 */

export type PaymentStatus = 'requires_confirmation' | 'succeeded' | 'failed' | 'refunded';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  orderId: number | null;
  userId: number;
  createdAt: string;
  confirmedAt: string | null;
  failureReason: string | null;
}

export interface WebhookEvent {
  id: string;
  type: 'payment_intent.succeeded' | 'payment_intent.failed' | 'payment_intent.refunded';
  paymentIntentId: string;
  orderId: number | null;
  timestamp: string;
}

export class PaymentService {
  private intents: Map<string, PaymentIntent> = new Map();
  private webhooks: WebhookEvent[] = [];

  /**
   * Create a Payment Intent (Step 1 of Stripe flow)
   */
  createPaymentIntent(amount: number, userId: number, orderId: number | null = null): PaymentIntent {
    const id = `pi_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;

    const intent: PaymentIntent = {
      id,
      amount,
      currency: 'pkr',
      status: 'requires_confirmation',
      orderId,
      userId,
      createdAt: new Date().toISOString(),
      confirmedAt: null,
      failureReason: null,
    };

    this.intents.set(id, intent);
    return intent;
  }

  /**
   * Confirm a Payment Intent (Step 2 of Stripe flow)
   * Simulates card processing with 80% success rate
   */
  confirmPaymentIntent(intentId: string, simulateFailure: boolean = false): PaymentIntent {
    const intent = this.intents.get(intentId);

    if (!intent) {
      throw new Error(`Payment intent '${intentId}' not found`);
    }

    if (intent.status !== 'requires_confirmation') {
      throw new Error(`Payment intent already ${intent.status}`);
    }

    // Simulate payment processing
    const shouldFail = simulateFailure || Math.random() < 0.1; // 10% random failure

    if (shouldFail) {
      intent.status = 'failed';
      intent.failureReason = 'Card declined by issuer';

      this.webhooks.push({
        id: `evt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
        type: 'payment_intent.failed',
        paymentIntentId: intent.id,
        orderId: intent.orderId,
        timestamp: new Date().toISOString(),
      });
    } else {
      intent.status = 'succeeded';
      intent.confirmedAt = new Date().toISOString();

      this.webhooks.push({
        id: `evt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
        type: 'payment_intent.succeeded',
        paymentIntentId: intent.id,
        orderId: intent.orderId,
        timestamp: new Date().toISOString(),
      });
    }

    return intent;
  }

  /**
   * Refund a Payment Intent
   */
  refundPaymentIntent(intentId: string): PaymentIntent {
    const intent = this.intents.get(intentId);

    if (!intent) throw new Error(`Payment intent '${intentId}' not found`);
    if (intent.status !== 'succeeded') throw new Error('Can only refund succeeded payments');

    intent.status = 'refunded';

    this.webhooks.push({
      id: `evt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
      type: 'payment_intent.refunded',
      paymentIntentId: intent.id,
      orderId: intent.orderId,
      timestamp: new Date().toISOString(),
    });

    return intent;
  }

  /**
   * Get payment intent by ID
   */
  getPaymentIntent(intentId: string): PaymentIntent | null {
    return this.intents.get(intentId) ?? null;
  }

  /**
   * Get all webhook events
   */
  getWebhookEvents(limit: number = 20): WebhookEvent[] {
    return this.webhooks.slice(-limit).reverse();
  }

  /**
   * Get all payment intents
   */
  getAllIntents(): PaymentIntent[] {
    return Array.from(this.intents.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

// Global payment service instance
export const paymentService = new PaymentService();