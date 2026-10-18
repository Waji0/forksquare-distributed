// import crypto from 'crypto';

// /**
//  * Payment Service (Stripe-like Simulation)
//  * 
//  * Mirrors Stripe's Payment Intent API structure:
//  * 1. Create Payment Intent → returns client_secret
//  * 2. Confirm Payment Intent → processes the charge
//  * 3. Webhook → notifies the system of payment events
//  * 
//  * In production, this would call the real Stripe API.
//  * This simulation demonstrates the architecture without API keys.
//  */

// export type PaymentStatus = 'requires_confirmation' | 'succeeded' | 'failed' | 'refunded';

// export interface PaymentIntent {
//   id: string;
//   amount: number;
//   currency: string;
//   status: PaymentStatus;
//   orderId: number | null;
//   userId: number;
//   createdAt: string;
//   confirmedAt: string | null;
//   failureReason: string | null;
// }

// export interface WebhookEvent {
//   id: string;
//   type: 'payment_intent.succeeded' | 'payment_intent.failed' | 'payment_intent.refunded';
//   paymentIntentId: string;
//   orderId: number | null;
//   timestamp: string;
// }

// export class PaymentService {
//   private intents: Map<string, PaymentIntent> = new Map();
//   private webhooks: WebhookEvent[] = [];

//   /**
//    * Create a Payment Intent (Step 1 of Stripe flow)
//    */
//   createPaymentIntent(amount: number, userId: number, orderId: number | null = null): PaymentIntent {
//     const id = `pi_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;

//     const intent: PaymentIntent = {
//       id,
//       amount,
//       currency: 'pkr',
//       status: 'requires_confirmation',
//       orderId,
//       userId,
//       createdAt: new Date().toISOString(),
//       confirmedAt: null,
//       failureReason: null,
//     };

//     this.intents.set(id, intent);
//     return intent;
//   }

//   /**
//    * Confirm a Payment Intent (Step 2 of Stripe flow)
//    * Simulates card processing with 80% success rate
//    */
//   confirmPaymentIntent(intentId: string, simulateFailure: boolean = false): PaymentIntent {
//     const intent = this.intents.get(intentId);

//     if (!intent) {
//       throw new Error(`Payment intent '${intentId}' not found`);
//     }

//     if (intent.status !== 'requires_confirmation') {
//       throw new Error(`Payment intent already ${intent.status}`);
//     }

//     // Simulate payment processing
//     const shouldFail = simulateFailure || Math.random() < 0.1; // 10% random failure

//     if (shouldFail) {
//       intent.status = 'failed';
//       intent.failureReason = 'Card declined by issuer';

//       this.webhooks.push({
//         id: `evt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
//         type: 'payment_intent.failed',
//         paymentIntentId: intent.id,
//         orderId: intent.orderId,
//         timestamp: new Date().toISOString(),
//       });
//     } else {
//       intent.status = 'succeeded';
//       intent.confirmedAt = new Date().toISOString();

//       this.webhooks.push({
//         id: `evt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
//         type: 'payment_intent.succeeded',
//         paymentIntentId: intent.id,
//         orderId: intent.orderId,
//         timestamp: new Date().toISOString(),
//       });
//     }

//     return intent;
//   }

//   /**
//    * Refund a Payment Intent
//    */
//   refundPaymentIntent(intentId: string): PaymentIntent {
//     const intent = this.intents.get(intentId);

//     if (!intent) throw new Error(`Payment intent '${intentId}' not found`);
//     if (intent.status !== 'succeeded') throw new Error('Can only refund succeeded payments');

//     intent.status = 'refunded';

//     this.webhooks.push({
//       id: `evt_${crypto.randomUUID().replace(/-/g, '').substring(0, 16)}`,
//       type: 'payment_intent.refunded',
//       paymentIntentId: intent.id,
//       orderId: intent.orderId,
//       timestamp: new Date().toISOString(),
//     });

//     return intent;
//   }

//   /**
//    * Get payment intent by ID
//    */
//   getPaymentIntent(intentId: string): PaymentIntent | null {
//     return this.intents.get(intentId) ?? null;
//   }

//   /**
//    * Get all webhook events
//    */
//   getWebhookEvents(limit: number = 20): WebhookEvent[] {
//     return this.webhooks.slice(-limit).reverse();
//   }

//   /**
//    * Get all payment intents
//    */
//   getAllIntents(): PaymentIntent[] {
//     return Array.from(this.intents.values()).sort(
//       (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//     );
//   }
// }

// // Global payment service instance
// export const paymentService = new PaymentService();





import Stripe from 'stripe';
import crypto from 'crypto';
import { env } from '../config/env';
import logger from '../config/logger';

/**
 * Payment Service — Real Stripe Integration
 *
 * Auto-detects whether STRIPE_SECRET_KEY is configured:
 * - YES → uses real Stripe test mode (charges fake cards)
 * - NO  → falls back to in-memory simulation
 */

export type PaymentStatus = 'requires_confirmation' | 'succeeded' | 'failed' | 'refunded';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  orderId: number | null;
  clientSecret?: string;
}

class PaymentService {
  private stripe: Stripe | null = null;
  private isRealMode = false;

  // Fallback in-memory storage (used only when Stripe is not configured)
  private simulationIntents: Map<string, PaymentIntent> = new Map();

  constructor() {
    if (env.STRIPE_SECRET_KEY && env.STRIPE_SECRET_KEY.startsWith('sk_')) {
      this.stripe = new Stripe(env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-06-20' as any,
        typescript: true,
      });
      this.isRealMode = true;
      logger.info('💳 Stripe initialized in TEST MODE');
    } else {
      logger.warn('⚠️  Stripe not configured. Payment service running in SIMULATION mode.');
    }
  }

  async createPaymentIntent(
    amount: number,
    userId: number,
    orderId: number | null = null
  ): Promise<PaymentIntent> {
    if (this.isRealMode && this.stripe) {
      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Stripe uses cents
        currency: 'pkr',
        metadata: {
          user_id: userId.toString(),
          order_id: orderId?.toString() ?? 'none',
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never', // Only accept non-redirect payment methods (cards)
        },
      });

      return {
        id: intent.id,
        amount,
        currency: intent.currency,
        status: intent.status as PaymentStatus,
        orderId,
        clientSecret: intent.client_secret ?? undefined,
      };
    }

    // Simulation fallback
    const id = `pi_sim_${crypto.randomUUID().replace(/-/g, '').substring(0, 24)}`;
    const intent: PaymentIntent = {
      id,
      amount,
      currency: 'pkr',
      status: 'requires_confirmation',
      orderId,
      clientSecret: `${id}_secret_sim`,
    };
    this.simulationIntents.set(id, intent);
    return intent;
  }

  async confirmPaymentIntent(
    intentId: string,
    simulateFailure: boolean = false
  ): Promise<PaymentIntent> {
    if (this.isRealMode && this.stripe) {
      if (simulateFailure) {
        // Use Stripe's test magic card token to force a decline
        await this.stripe.paymentIntents.cancel(intentId);
        const canceled = await this.stripe.paymentIntents.retrieve(intentId);
        return {
          id: canceled.id,
          amount: canceled.amount / 100,
          currency: canceled.currency,
          status: 'failed',
          orderId: null,
        };
      }

      // Use Stripe test token to force success
      const confirmed = await this.stripe.paymentIntents.confirm(intentId, {
        payment_method: 'pm_card_visa', // Stripe's test Visa card
      });

      return {
        id: confirmed.id,
        amount: confirmed.amount / 100,
        currency: confirmed.currency,
        status: confirmed.status as PaymentStatus,
        orderId: null,
      };
    }

    // Simulation fallback
    const intent = this.simulationIntents.get(intentId);
    if (!intent) throw new Error(`Payment intent '${intentId}' not found`);

    if (simulateFailure || Math.random() < 0.1) {
      intent.status = 'failed';
    } else {
      intent.status = 'succeeded';
    }
    return intent;
  }

  async refundPaymentIntent(intentId: string): Promise<PaymentIntent> {
    if (this.isRealMode && this.stripe) {
      const refund = await this.stripe.refunds.create({ payment_intent: intentId });
      const intent = await this.stripe.paymentIntents.retrieve(intentId);

      return {
        id: intent.id,
        amount: intent.amount / 100,
        currency: intent.currency,
        status: refund.status === 'succeeded' ? 'refunded' : 'failed',
        orderId: null,
      };
    }

    const intent = this.simulationIntents.get(intentId);
    if (!intent) throw new Error(`Payment intent '${intentId}' not found`);
    if (intent.status !== 'succeeded') throw new Error('Can only refund succeeded payments');
    intent.status = 'refunded';
    return intent;
  }

  isReal(): boolean {
    return this.isRealMode;
  }
}

export const paymentService = new PaymentService();