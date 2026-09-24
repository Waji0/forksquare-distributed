import { Request, Response, NextFunction } from 'express';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';
import { acquireLock } from '../services/distributedLock';

/**
 * POST /api/flash-sale/buy
 * 
 * Instructor Requirement: "handle 2 parallel transactions on same seat"
 * Course Mapping: Week 11 - MVCC & Concurrency Control
 * 
 * Flow:
 * 1. Acquire Redis Distributed Lock (Prevents thundering herd)
 * 2. Read current inventory and version (MVCC)
 * 3. Attempt UPDATE with version check
 * 4. Release Lock
 */
export async function buyFlashSaleItem(req: Request, res: Response, next: NextFunction) {
  const { itemId, userId } = req.body;

  if (!itemId || !userId) {
    return next(new ApiError(400, 'itemId and userId are required'));
  }

  const lockKey = `flash_sale:${itemId}`;
  
  // Step 1: Try to acquire distributed lock (Wait up to 2 seconds)
  const lock = await acquireLock(lockKey, 2000);

  if (!lock) {
    // Another user is currently processing this exact item
    return res.status(409).json({
      success: false,
      error: 'Transaction conflict: Another user is currently purchasing this item. Please try again.',
      concurrencyLayer: 'redis_lock_rejected'
    });
  }

  const client = await pgPool.connect();

  try {
    // Step 2: Read current state (MVCC Snapshot)
    const inventoryRes = await client.query(
      'SELECT quantity, version FROM inventory WHERE item_id = $1',
      [itemId]
    );

    if (inventoryRes.rows.length === 0) {
      throw new ApiError(404, 'Flash sale item not found');
    }

    const { quantity, version } = inventoryRes.rows[0];

    if (quantity <= 0) {
      throw new ApiError(409, 'SOLD OUT: Item is no longer available.');
    }

    // Step 3: Attempt Deduction with Optimistic Concurrency Control (MVCC)
    // We check `version = $3` to ensure no one else modified it between our SELECT and UPDATE
    const updateRes = await client.query(
      `UPDATE inventory 
       SET quantity = quantity - 1, version = version + 1 
       WHERE item_id = $1 AND quantity > 0 AND version = $2`,
      [itemId, version]
    );

    if (updateRes.rowCount === 0) {
      // This happens if another transaction bypassed the Redis lock 
      // and modified the DB row simultaneously (MVCC caught it!)
      throw new ApiError(409, 'Concurrency conflict: Item was just purchased by someone else.');
    }

    // Step 4: Create the Order
    await client.query(
      `INSERT INTO orders (user_id, status, total_amount) VALUES ($1, $2, $3)`,
      [userId, 'CONFIRMED_FLASH_SALE', 99.99]
    );

    res.status(201).json({
      success: true,
      message: 'Successfully purchased the flash sale item!',
      data: {
        itemId,
        remainingQuantity: quantity - 1,
        newVersion: version + 1
      },
      concurrencyLayer: 'success'
    });

  } catch (error) {
    next(error);
  } finally {
    // Step 5: ALWAYS release the lock
    await lock.release();
    client.release();
  }
}

/**
 * GET /api/flash-sale/status/:itemId
 */
export async function getFlashSaleStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { itemId } = req.params;
    const result = await pgPool.query(
      'SELECT item_id, quantity, version FROM inventory WHERE item_id = $1',
      [itemId]
    );

    if (result.rows.length === 0) {
      throw new ApiError(404, 'Item not found');
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
}