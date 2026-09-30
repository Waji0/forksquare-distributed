import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';

/**
 * Order Status Flow:
 * PENDING → CONFIRMED → PREPARING → OUT_FOR_DELIVERY → DELIVERED
 *                                                    → CANCELLED (from any state)
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ]),
  note: z.string().optional(),
});

// ==========================================
// PATCH /api/order-tracking/:orderId/status
// ==========================================
export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = Number(req.params.orderId);
    if (isNaN(orderId)) throw new ApiError(400, 'Invalid order ID');

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new ApiError(400, 'Invalid status value');

    const { status, note } = parsed.data;

    // Get current order status
    const orderResult = await pgPool.query(
      'SELECT id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new ApiError(404, 'Order not found');
    }

    const currentStatus = orderResult.rows[0].status;
    const allowedTransitions = VALID_TRANSITIONS[currentStatus] ?? [];

    if (!allowedTransitions.includes(status)) {
      throw new ApiError(
        400,
        `Invalid transition: Cannot go from '${currentStatus}' to '${status}'. Allowed: [${allowedTransitions.join(', ')}]`
      );
    }

    const client = await pgPool.connect();

    try {
      await client.query('BEGIN');

      // Update order status
      await client.query(
        'UPDATE orders SET status = $1 WHERE id = $2',
        [status, orderId]
      );

      // Add to tracking history
      await client.query(
        `INSERT INTO order_status_history (order_id, status, note)
         VALUES ($1, $2, $3)`,
        [orderId, status, note ?? `Status updated to ${status}`]
      );

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          orderId,
          previousStatus: currentStatus,
          newStatus: status,
          note: note ?? `Status updated to ${status}`,
        },
        message: `Order #${orderId} status updated: ${currentStatus} → ${status}`,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/order-tracking/:orderId
// ==========================================
export async function getOrderTracking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = Number(req.params.orderId);
    if (isNaN(orderId)) throw new ApiError(400, 'Invalid order ID');

    // Get order details
    const orderResult = await pgPool.query(
      'SELECT id, user_id, status, total_amount, created_at FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new ApiError(404, 'Order not found');
    }

    // Get status history
    const historyResult = await pgPool.query(
      `SELECT status, note, updated_at
       FROM order_status_history
       WHERE order_id = $1
       ORDER BY updated_at ASC`,
      [orderId]
    );

    res.json({
      success: true,
      data: {
        order: orderResult.rows[0],
        timeline: historyResult.rows,
        currentStatus: orderResult.rows[0].status,
        allowedNextStatuses: VALID_TRANSITIONS[orderResult.rows[0].status] ?? [],
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/order-tracking/valid-transitions
// ==========================================
export function getValidTransitions(_req: Request, res: Response, _next: NextFunction): void {
  res.json({
    success: true,
    data: VALID_TRANSITIONS,
    explanation: 'Each status can only transition to specific next statuses. This prevents invalid state changes (e.g., DELIVERED → PREPARING).',
  });
}