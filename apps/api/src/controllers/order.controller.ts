// import { Request, Response, NextFunction } from 'express';
// import { z } from 'zod';
// import { pgPool } from '../config/db';
// import { ApiError } from '../middlewares/errorHandler';

// // ==========================================
// // Zod Schema
// // ==========================================
// const createOrderSchema = z.object({
//   userId: z.number().int().positive(),
//   items: z.array(
//     z.object({
//       itemId: z.string().min(1),
//       quantity: z.number().int().positive(),
//       price: z.number().positive(),
//     })
//   ).min(1),
// });

// // ==========================================
// // POST /api/orders
// // ==========================================
// export async function createOrder(req: Request, res: Response, next: NextFunction) {
//   try {
//     const parsed = createOrderSchema.safeParse(req.body);

//     if (!parsed.success) {
//       throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
//     }

//     const { userId, items } = parsed.data;

//     // Calculate total
//     const totalAmount = items.reduce(
//       (sum, item) => sum + item.price * item.quantity,
//       0
//     );

//     // Begin transaction
//     const client = await pgPool.connect();

//     try {
//       await client.query('BEGIN');

//       // Check and reserve inventory (with row-level lock)
//       for (const item of items) {
//         const inventoryResult = await client.query(
//           'SELECT quantity FROM inventory WHERE item_id = $1 FOR UPDATE',
//           [item.itemId]
//         );

//         if (inventoryResult.rows.length === 0) {
//           throw new ApiError(404, `Item ${item.itemId} not found in inventory`);
//         }

//         const availableQuantity = inventoryResult.rows[0].quantity as number;

//         if (availableQuantity < item.quantity) {
//           throw new ApiError(
//             409,
//             `Insufficient stock for item ${item.itemId}. Available: ${availableQuantity}`
//           );
//         }

//         // Deduct inventory
//         await client.query(
//           `UPDATE inventory
//            SET quantity = quantity - $1, version = version + 1
//            WHERE item_id = $2`,
//           [item.quantity, item.itemId]
//         );
//       }

//       // Create order
//       const orderResult = await client.query(
//         `INSERT INTO orders (user_id, status, total_amount)
//          VALUES ($1, $2, $3)
//          RETURNING id, user_id, status, total_amount, created_at`,
//         [userId, 'CONFIRMED', totalAmount]
//       );

//       await client.query('COMMIT');

//       res.status(201).json({
//         success: true,
//         data: orderResult.rows[0],
//       });
//     } catch (error) {
//       await client.query('ROLLBACK');
//       throw error;
//     } finally {
//       client.release();
//     }
//   } catch (error) {
//     next(error);
//   }
// }

// // ==========================================
// // GET /api/orders
// // ==========================================
// export async function getOrders(req: Request, res: Response, next: NextFunction) {
//   try {
//     const { userId } = req.query;

//     let query = 'SELECT * FROM orders';
//     const params: unknown[] = [];

//     if (userId) {
//       query += ' WHERE user_id = $1';
//       params.push(Number(userId));
//     }

//     query += ' ORDER BY created_at DESC LIMIT 50';

//     const result = await pgPool.query(query, params);

//     res.json({
//       success: true,
//       data: result.rows,
//     });
//   } catch (error) {
//     next(error);
//   }
// }

// // ==========================================
// // GET /api/orders/:id
// // ==========================================
// export async function getOrderById(req: Request, res: Response, next: NextFunction) {
//   try {
//     const { id } = req.params;

//     const result = await pgPool.query('SELECT * FROM orders WHERE id = $1', [
//       Number(id),
//     ]);

//     if (result.rows.length === 0) {
//       throw new ApiError(404, 'Order not found');
//     }

//     res.json({
//       success: true,
//       data: result.rows[0],
//     });
//   } catch (error) {
//     next(error);
//   }
// }






import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';
import { SagaOrchestrator } from '../services/saga';

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
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'Validation failed');

    const { userId, items } = parsed.data;
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    let orderId: number | null = null;
    const client = await pgPool.connect();

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
      
      res.status(201).json({
        success: true,
        message: 'Order placed successfully via Saga Pattern',
        data: { orderId, totalAmount }
      });
    } catch (error) {
      await client.query('ROLLBACK'); // Ensure DB transaction is rolled back
      throw new ApiError(400, `Saga Failed: ${(error as Error).message}`);
    } finally {
      client.release();
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