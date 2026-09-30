import { pgPool } from '../config/db';

/**
 * Distributed Join Service
 * 
 * Course Mapping: Week 14 - "Query decomposition; distributed joins
 * (Semi-join, Bloom join, shuffle joins); global cost-based query optimization"
 * 
 * In a distributed system, joining two tables on different nodes is expensive
 * because data must be shipped over the network.
 * 
 * Strategies:
 * 1. SHIP THE WHOLE TABLE: Send entire table to the other node (expensive)
 * 2. SEMI-JOIN: Send only the JOIN KEYS (cheaper)
 * 3. BLOOM JOIN: Send a Bloom filter of join keys (cheapest, probabilistic)
 */

export interface JoinResult {
  strategy: string;
  steps: Array<{ step: number; action: string; dataSize: string }>;
  result: Array<Record<string, unknown>>;
  networkCost: string;
  explanation: string;
}

/**
 * Simulated Semi-Join between Users and Orders
 * 
 * Normal JOIN: SELECT * FROM users JOIN orders ON users.id = orders.user_id
 * 
 * Semi-Join steps:
 * 1. Node B (Orders) sends DISTINCT user_ids to Node A (Users)
 * 2. Node A filters users by those IDs
 * 3. Node A sends filtered users back to Node B
 * 4. Node B performs local join
 */
export async function executeSemiJoin(): Promise<JoinResult> {
  const steps: JoinResult['steps'] = [];

  // Step 1: Get all user_ids from orders (simulating Node B)
  const orderUserIds = await pgPool.query(
    'SELECT DISTINCT user_id FROM orders'
  );
  const userIds = orderUserIds.rows.map(r => r.user_id);

  steps.push({
    step: 1,
    action: `Node B (Orders) extracts DISTINCT user_ids: [${userIds.join(', ')}]`,
    dataSize: `${userIds.length} integers (${userIds.length * 4} bytes)`,
  });

  // Step 2: Ship only the join keys to Node A (Users)
  steps.push({
    step: 2,
    action: 'Node B ships ONLY the join keys (user_ids) to Node A over the network',
    dataSize: `${userIds.length * 4} bytes (vs. full table: ~500 bytes)`,
  });

  // Step 3: Node A filters users by those IDs
  let filteredUsers: Array<Record<string, unknown>> = [];
  if (userIds.length > 0) {
    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
    const usersResult = await pgPool.query(
      `SELECT id, username, email FROM users WHERE id IN (${placeholders})`,
      userIds
    );
    filteredUsers = usersResult.rows;
  }

  steps.push({
    step: 3,
    action: `Node A (Users) filters users matching the received IDs. Found ${filteredUsers.length} users.`,
    dataSize: `${filteredUsers.length} rows shipped back`,
  });

  // Step 4: Node B performs local join
  let joinResult: Array<Record<string, unknown>> = [];

  if (filteredUsers.length > 0) {
    const userMap = new Map(filteredUsers.map(u => [u.id, u]));

    const ordersResult = await pgPool.query(
      'SELECT id, user_id, status, total_amount FROM orders ORDER BY created_at DESC LIMIT 10'
    );

    joinResult = ordersResult.rows.map(order => {
      const user = userMap.get(order.user_id);
      return {
        order_id: order.id,
        user_id: order.user_id,
        username: user ? (user.username as string) : 'UNKNOWN',
        email: user ? (user.email as string) : 'UNKNOWN',
        status: order.status,
        total_amount: order.total_amount,
      };
    });
  }

  steps.push({
    step: 4,
    action: 'Node B performs LOCAL join with the filtered users. No more network traffic.',
    dataSize: 'Local operation',
  });

  return {
    strategy: 'SEMI-JOIN',
    steps,
    result: joinResult,
    networkCost: `Only ${userIds.length} integers + ${filteredUsers.length} filtered rows shipped (vs. full table scan)`,
    explanation: 'The Semi-Join reduces network cost by shipping only JOIN KEYS instead of entire tables. This is critical in distributed systems where network bandwidth is the bottleneck. The trade-off is an extra round-trip between nodes.',
  };
}

/**
 * Simulated Bloom Join
 * Uses a Bloom filter to pre-filter rows before shipping
 */
export async function executeBloomJoin(): Promise<JoinResult> {
  const steps: JoinResult['steps'] = [];

  // Step 1: Node B builds a Bloom filter of user_ids
  const orderUserIds = await pgPool.query('SELECT DISTINCT user_id FROM orders');
  const userIds = orderUserIds.rows.map(r => r.user_id as number);

  // Build simple Bloom filter (simulated)
  const bloomSize = 1024;
  const bloomFilter = new Array(bloomSize).fill(0);
  const numHashes = 3;

  for (const id of userIds) {
    for (let h = 0; h < numHashes; h++) {
      const hash = Math.abs((id * 31 + h * 17) % bloomSize);
      bloomFilter[hash] = 1;
    }
  }

  const bloomBits = bloomFilter.filter(b => b === 1).length;

  steps.push({
    step: 1,
    action: `Node B builds Bloom filter of ${userIds.length} user_ids (${bloomBits}/${bloomSize} bits set)`,
    dataSize: `${bloomSize} bits (${bloomSize / 8} bytes)`,
  });

  // Step 2: Ship Bloom filter to Node A
  steps.push({
    step: 2,
    action: 'Node B ships the Bloom filter to Node A',
    dataSize: `${bloomSize / 8} bytes (much smaller than ${userIds.length} full integers)`,
  });

  // Step 3: Node A probes Bloom filter to filter users
  let matchingUsers: Array<Record<string, unknown>> = [];
  const usersResult = await pgPool.query('SELECT id, username, email FROM users');

  for (const user of usersResult.rows) {
    // Probe Bloom filter
    let mightExist = true;
    for (let h = 0; h < numHashes; h++) {
      const hash = Math.abs((user.id * 31 + h * 17) % bloomSize);
      if (bloomFilter[hash] === 0) {
        mightExist = false;
        break;
      }
    }
    if (mightExist) {
      matchingUsers.push(user);
    }
  }

  steps.push({
    step: 3,
    action: `Node A probes Bloom filter for each user. ${matchingUsers.length} users MIGHT match (some false positives possible).`,
    dataSize: `${matchingUsers.length} candidate rows`,
  });

  // Step 4: Ship candidates and do exact join
  steps.push({
    step: 4,
    action: 'Node A ships candidate rows to Node B for exact join verification',
    dataSize: `${matchingUsers.length} rows`,
  });

  return {
    strategy: 'BLOOM JOIN',
    steps,
    result: matchingUsers,
    networkCost: `${bloomSize / 8} bytes (Bloom filter) + ${matchingUsers.length} candidate rows`,
    explanation: 'The Bloom Join is even cheaper than Semi-Join because it ships a compact Bloom filter instead of actual join keys. The trade-off is false positives: some non-matching rows may be shipped unnecessarily. But false negatives are impossible, so no matching rows are ever missed.',
  };
}

/**
 * Compare all join strategies
 */
export function compareJoinStrategies(): Record<string, unknown> {
  return {
    strategies: [
      {
        name: 'Ship Whole Table',
        networkCost: 'O(N) - Entire table shipped',
        roundTrips: 1,
        accuracy: '100%',
        useCase: 'Small tables, simple queries',
      },
      {
        name: 'Semi-Join',
        networkCost: 'O(K) - Only join keys shipped',
        roundTrips: 2,
        accuracy: '100%',
        useCase: 'Large tables, selective joins',
      },
      {
        name: 'Bloom Join',
        networkCost: 'O(M) - Bloom filter shipped (M << K)',
        roundTrips: 2,
        accuracy: '~99% (small false positive rate)',
        useCase: 'Very large tables, bandwidth-constrained networks',
      },
      {
        name: 'Shuffle Join (Hash Partition)',
        networkCost: 'O(N+M) - Both tables re-partitioned by join key',
        roundTrips: 1,
        accuracy: '100%',
        useCase: 'Equi-joins on large tables with similar size',
      },
    ],
    courseMapping: 'Week 14: Distributed Query Processing & Optimization',
  };
}