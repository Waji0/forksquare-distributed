/**
 * OpenAPI Endpoint Definitions
 *
 * These JSDoc blocks are parsed by swagger-jsdoc and rendered
 * as interactive documentation at /api/docs.
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: foodlover
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [user, restaurant]
 *                 default: user
 *     responses:
 *       201:
 *         description: User registered. Returns access + refresh tokens.
 *       409:
 *         description: Email or username already exists
 *       400:
 *         description: Validation failed
 */

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Login and receive JWT tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@forksquare.com
 *               password:
 *                 type: string
 *                 example: admin_password_123
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */

/**
 * @openapi
 * /api/auth/check-username:
 *   get:
 *     summary: Check username availability via Bloom Filter (O(1))
 *     tags: [Auth]
 *     description: |
 *       Uses a Redis-backed Bloom Filter for constant-time lookup.
 *       Demonstrates Week 6 distributed indexing.
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Availability check result with response time
 */

/**
 * @openapi
 * /api/restaurants:
 *   get:
 *     summary: List restaurants (cached)
 *     tags: [Restaurants]
 *     description: Returns restaurants from MongoDB with Redis cache-aside pattern.
 *     responses:
 *       200:
 *         description: List of restaurants
 */

/**
 * @openapi
 * /api/flash-sale/buy:
 *   post:
 *     summary: Purchase flash sale item (Concurrency Control)
 *     tags: [Flash Sale]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Demonstrates Week 11 concurrency control using Redis Distributed Locks
 *       + PostgreSQL MVCC. Prevents overselling under parallel load.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemId, userId]
 *             properties:
 *               itemId:
 *                 type: string
 *                 example: flash_burger_gold
 *               userId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Purchase successful
 *       409:
 *         description: Sold out or concurrency conflict
 */

/**
 * @openapi
 * /api/real-2pc/execute:
 *   post:
 *     summary: Execute a real Two-Phase Commit transaction
 *     tags: [2PC]
 *     description: |
 *       Uses actual PostgreSQL PREPARE TRANSACTION. Demonstrates Week 8
 *       distributed transactions and the coordinator blocking problem.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: integer
 *                 default: 1
 *               itemId:
 *                 type: string
 *                 default: item_pizza_1
 *               amount:
 *                 type: number
 *                 default: 999.99
 *               simulateCoordinatorCrash:
 *                 type: boolean
 *                 default: false
 *                 description: Set true to demonstrate the BLOCKING problem
 *               simulateNodeFailure:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: 2PC result (COMMITTED, ABORTED, or BLOCKED)
 */

/**
 * @openapi
 * /api/real-2pc/blocked:
 *   get:
 *     summary: List blocked (prepared) transactions
 *     tags: [2PC]
 *     description: Shows transactions stuck in pg_prepared_xacts after a coordinator crash.
 *     responses:
 *       200:
 *         description: List of blocked transactions
 */

/**
 * @openapi
 * /api/replication/status:
 *   get:
 *     summary: Streaming replication status
 *     tags: [Replication]
 *     description: |
 *       Returns live pg_stat_replication data showing the standby connection,
 *       WAL positions, and replication lag. Demonstrates Week 4 replication.
 *     responses:
 *       200:
 *         description: Replication status with connected standbys
 */

/**
 * @openapi
 * /api/partitions/list:
 *   get:
 *     summary: List all partitioned tables
 *     tags: [Partitions]
 *     description: |
 *       Inspects PostgreSQL catalog to show HASH and RANGE partitions.
 *       Demonstrates Week 3 data partitioning.
 *     responses:
 *       200:
 *         description: Partitioned tables and their child partitions
 */

/**
 * @openapi
 * /api/partitions/explain:
 *   get:
 *     summary: Prove partition pruning with EXPLAIN ANALYZE
 *     tags: [Partitions]
 *     parameters:
 *       - in: query
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *           enum: [orders, order_items, food_events]
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: EXPLAIN output showing which partitions were scanned
 */

/**
 * @openapi
 * /api/real-raft/cluster:
 *   get:
 *     summary: Raft cluster state (etcd)
 *     tags: [Raft]
 *     description: |
 *       Returns the 3-node etcd cluster state and current leader.
 *       Demonstrates Week 12 Raft consensus.
 *     responses:
 *       200:
 *         description: Cluster endpoints and current leader
 */

/**
 * @openapi
 * /api/real-raft/campaign:
 *   post:
 *     summary: Campaign for Raft leadership
 *     tags: [Raft]
 *     description: Attempts to win the Raft leader election. Only one node can win per term.
 *     responses:
 *       200:
 *         description: Election result (won or lost)
 */

export {};