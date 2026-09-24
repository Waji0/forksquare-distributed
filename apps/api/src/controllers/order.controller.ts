import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';
import { SagaOrchestrator } from '../services/saga';
import { publishOrderEvent } from '../services/eventPublisher';

const createOrderSchema = z.object({
  userId: z.number().int().positive(),
  items: z.array(
    z.object({
      itemId: z.string().min(1),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
    })
  ).min(1),
});

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  let client: any = null;

  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'Validation failed');

    const { userId, items } = parsed.data;
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    let orderId: number | null = null;
    client = await pgPool.connect();

    // Define the Saga
    const saga = new SagaOrchestrator();

    // Step 1: Reserve Inventory
    saga.addStep({
      name: 'Reserve Inventory',
      action: async () => {
        await client.query('BEGIN');
        for (const item of items) {
          const res = await client.query(
            'UPDATE inventory SET quantity = quantity - $1 WHERE item_id = $2 AND quantity >= $1',
            [item.quantity, item.itemId]
          );
          if (res.rowCount === 0) {
            throw new Error(`Insufficient stock for ${item.itemId}`);
          }
        }
      },
      compensate: async () => {
        console.log('[Compensate] Restoring inventory...');
        for (const item of items) {
          await client.query(
            'UPDATE inventory SET quantity = quantity + $1 WHERE item_id = $2',
            [item.quantity, item.itemId]
          );
        }
      }
    });

    // Step 2: Process Payment (Simulated)
    saga.addStep({
      name: 'Process Payment',
      action: async () => {
        // Simulate a random payment failure to demonstrate Saga compensation!
        // Change `false` to `true` to test the rollback.
        const simulatePaymentFailure = false; 
        
        if (simulatePaymentFailure) {
          throw new Error('Payment Gateway Declined Card');
        }
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500)); 
      },
      compensate: async () => {
        console.log('[Compensate] Refunding payment...');
        // In a real app, call Stripe refund API here
      }
    });

    // Step 3: Create Order Record
    saga.addStep({
      name: 'Create Order Record',
      action: async () => {
        const result = await client.query(
          `INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3) RETURNING id`,
          [userId, 'CONFIRMED', totalAmount]
        );
        orderId = result.rows[0].id;
        await client.query('COMMIT');
      },
      compensate: async () => {
        if (orderId) {
          console.log('[Compensate] Deleting order record...');
          await client.query('DELETE FROM orders WHERE id = $1', [orderId]);
        }
      }
    });

    // Execute the Saga
    try {
      await saga.execute();
      
      // 🚀 EMIT SUCCESS EVENT TO KAFKA
      await publishOrderEvent({
        eventType: 'ORDER_CREATED',
        orderId: orderId!,
        userId,
        totalAmount,
        timestamp: new Date().toISOString()
      });

      res.status(201).json({
        success: true,
        message: 'Order placed successfully via Saga Pattern',
        data: { orderId, totalAmount }
      });
    } catch (error) {
      await client.query('ROLLBACK'); 
      
      // 🚀 EMIT FAILURE EVENT TO KAFKA
      await publishOrderEvent({
        eventType: 'ORDER_FAILED',
        userId,
        reason: (error as Error).message,
        timestamp: new Date().toISOString()
      });

      throw new ApiError(400, `Saga Failed: ${(error as Error).message}`);
    } finally {
      if (client) client.release();
    }

  } catch (error) {
    next(error);
  }
}

export async function getOrders(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pgPool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    res.json({ success: true, data: result.rows });
  } catch (error) { next(error); }
}

export async function getOrderById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pgPool.query('SELECT * FROM orders WHERE id = $1', [Number(req.params.id)]);
    if (result.rows.length === 0) throw new ApiError(404, 'Order not found');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
}