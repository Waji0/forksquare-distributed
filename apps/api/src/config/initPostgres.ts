// import { pgPool } from './db';

// export async function initPostgresTables() {
//   const client = await pgPool.connect();
//   try {
//     // Enable pgvector extension
//     await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
//     console.log('✅ pgvector extension enabled');

//     await client.query(`
//       CREATE TABLE IF NOT EXISTS users (
//         id SERIAL PRIMARY KEY,
//         username VARCHAR(255) UNIQUE NOT NULL,
//         email VARCHAR(255) UNIQUE NOT NULL,
//         password_hash VARCHAR(255) NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     // Phase 0: Add role column for RBAC
//     await client.query(`
//       ALTER TABLE users
//       ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';
//     `);

//     // Phase 0: Refresh tokens table for proper token lifecycle
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS refresh_tokens (
//         id SERIAL PRIMARY KEY,
//         user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
//         token_hash VARCHAR(255) NOT NULL,
//         expires_at TIMESTAMP NOT NULL,
//         revoked BOOLEAN NOT NULL DEFAULT FALSE,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     // Phase 0: Index for fast refresh token lookups
//     await client.query(`
//       CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
//       ON refresh_tokens(user_id);
//     `);
//     await client.query(`
//       CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
//       ON refresh_tokens(token_hash);
//     `);

//     // Phase 1: Table used to demonstrate replication lag
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS replication_demo (
//         id SERIAL PRIMARY KEY,
//         test_value TEXT NOT NULL,
//         written_at TIMESTAMP DEFAULT now()
//       );
//     `);

//     await client.query(`
//       CREATE TABLE IF NOT EXISTS inventory (
//         id SERIAL PRIMARY KEY,
//         item_id VARCHAR(255) UNIQUE NOT NULL,
//         quantity INT NOT NULL DEFAULT 0,
//         version INT NOT NULL DEFAULT 1
//       );
//     `);

//     await client.query(`
//       CREATE TABLE IF NOT EXISTS orders (
//         id SERIAL PRIMARY KEY,
//         user_id INT REFERENCES users(id),
//         status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
//         total_amount DECIMAL(10, 2) NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     await client.query(`
//       CREATE TABLE IF NOT EXISTS event_logs (
//         id SERIAL PRIMARY KEY,
//         topic VARCHAR(100) NOT NULL,
//         event_type VARCHAR(50) NOT NULL,
//         payload JSONB NOT NULL,
//         processed_by VARCHAR(50) NOT NULL,
//         processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     // NEW: Food Embeddings Table for Vector Similarity Search
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS food_embeddings (
//         id SERIAL PRIMARY KEY,
//         food_name VARCHAR(255) NOT NULL,
//         restaurant_name VARCHAR(255) NOT NULL,
//         category VARCHAR(100) NOT NULL,
//         description TEXT,
//         embedding vector(128) NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//       );
//     `);

//     // Create index for faster similarity search (IVFFlat)
//     // Note: Index creation may fail with very few rows, so we wrap in try/catch
//     try {
//       await client.query(`
//         CREATE INDEX IF NOT EXISTS food_embeddings_vector_idx 
//         ON food_embeddings 
//         USING ivfflat (embedding vector_cosine_ops) 
//         WITH (lists = 5);
//       `);
//       console.log('✅ Vector index created');
//     } catch {
//       console.log('⚠️  Vector index skipped (not enough rows for IVFFlat)');
//     }

//     // NEW: Cart Items Table
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS cart_items (
//         id SERIAL PRIMARY KEY,
//         user_id INT NOT NULL,
//         item_id VARCHAR(255) NOT NULL,
//         item_name VARCHAR(255) NOT NULL,
//         restaurant_name VARCHAR(255) NOT NULL,
//         quantity INT NOT NULL DEFAULT 1,
//         price DECIMAL(10, 2) NOT NULL,
//         added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         UNIQUE(user_id, item_id)
//       );
//     `);

//     // NEW: Order Tracking Status History
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS order_status_history (
//         id SERIAL PRIMARY KEY,
//         order_id INT NOT NULL REFERENCES orders(id),
//         status VARCHAR(50) NOT NULL,
//         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//         note TEXT DEFAULT ''
//       );
//     `);

//     console.log('✅ PostgreSQL Tables Initialized');
//   } catch (error) {
//     console.error('❌ Error initializing PostgreSQL tables:', error);
//   } finally {
//     client.release();
//   }
// }




import { pgPool } from './db';

export async function initPostgresTables() {
  const client = await pgPool.connect();
  try {
    // ==========================================
    // Enable pgvector extension
    // ==========================================
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('✅ pgvector extension enabled');

    // ==========================================
    // USERS TABLE (not partitioned — small reference data)
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==========================================
    // INVENTORY TABLE (not partitioned — small reference data)
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_id VARCHAR(255) UNIQUE NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        version INT NOT NULL DEFAULT 1
      );
    `);

    // ==========================================
    // REFRESH TOKENS (not partitioned)
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==========================================
    // PHASE 2: ORDERS TABLE — HASH PARTITIONED by user_id
    // ==========================================
    //
    // Course Mapping: Week 3 - Hash-based partitioning
    //
    // WHY HASH PARTITIONING?
    // - Distributes users evenly across partitions
    // - All orders for a single user go to the SAME partition
    //   (co-location = fast single-user queries)
    // - No hotspots (even distribution)
    //
    // We use PostgreSQL 16 declarative partitioning with MODULUS 4
    // which creates 4 partitions that collectively cover all possible
    // hash values of user_id.
    // ==========================================

    // First, drop old non-partitioned orders table if it exists
    // (safe to do on fresh install; in production you'd use pg_partman)
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'orders'
          AND table_type = 'BASE TABLE'
        ) THEN
          -- Check if it's already partitioned
          IF NOT EXISTS (
            SELECT 1 FROM pg_partitioned_table
            WHERE partrelid = 'orders'::regclass
          ) THEN
            DROP TABLE orders CASCADE;
          END IF;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL,
        user_id INT NOT NULL REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        total_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, user_id)
      ) PARTITION BY HASH (user_id);
    `);

    // Create 4 hash partitions
    for (let i = 0; i < 4; i++) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders_p${i}
        PARTITION OF orders
        FOR VALUES WITH (MODULUS 4, REMAINDER ${i});
      `);
    }

    // ==========================================
    // PHASE 2: ORDER_ITEMS TABLE — HASH PARTITIONED by order_id
    // ==========================================
    //
    // Aligned with orders so that order_items for a given order
    // land on the same partition as the order itself (co-location).
    // ==========================================

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'order_items'
          AND table_type = 'BASE TABLE'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_partitioned_table
            WHERE partrelid = 'order_items'::regclass
          ) THEN
            DROP TABLE order_items CASCADE;
          END IF;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL,
        order_id INT NOT NULL,
        user_id INT NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, order_id, user_id)
      ) PARTITION BY HASH (order_id);
    `);

    for (let i = 0; i < 4; i++) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS order_items_p${i}
        PARTITION OF order_items
        FOR VALUES WITH (MODULUS 4, REMAINDER ${i});
      `);
    }

    // ==========================================
    // PHASE 2: FOOD_EVENTS TABLE — RANGE PARTITIONED by created_at
    // ==========================================
    //
    // Course Mapping: Week 3 - Range-based partitioning
    //
    // WHY RANGE PARTITIONING?
    // - Time-series data (analytics events)
    // - Easy to drop old partitions (e.g., drop Jan 2025 partition)
    // - Queries with time filters only scan relevant partitions
    // ==========================================

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_name = 'food_events'
          AND table_type = 'BASE TABLE'
        ) THEN
          IF NOT EXISTS (
            SELECT 1 FROM pg_partitioned_table
            WHERE partrelid = 'food_events'::regclass
          ) THEN
            DROP TABLE food_events CASCADE;
          END IF;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS food_events (
        id SERIAL,
        event_type VARCHAR(100) NOT NULL,
        user_id INT,
        restaurant_name VARCHAR(255),
        food_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      ) PARTITION BY RANGE (created_at);
    `);

    // Create monthly partitions for current month + next 11 months (1 full year)
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const partitionName = `food_events_${start.getFullYear()}_${String(start.getMonth() + 1).padStart(2, '0')}`;

      await client.query(`
        CREATE TABLE IF NOT EXISTS ${partitionName}
        PARTITION OF food_events
        FOR VALUES FROM ('${start.toISOString().split('T')[0]}') TO ('${end.toISOString().split('T')[0]}');
      `);
    }

    // ==========================================
    // EVENT LOGS (existing — keep as-is)
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS event_logs (
        id SERIAL PRIMARY KEY,
        topic VARCHAR(100) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        processed_by VARCHAR(50) NOT NULL,
        processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ==========================================
    // CART ITEMS (existing)
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL,
        item_id VARCHAR(255) NOT NULL,
        item_name VARCHAR(255) NOT NULL,
        restaurant_name VARCHAR(255) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price DECIMAL(10, 2) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, item_id)
      );
    `);

    // ==========================================
    // ORDER STATUS HISTORY (existing)
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL,
        status VARCHAR(50) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        note TEXT DEFAULT ''
      );
    `);

    // ==========================================
    // REPLICATION DEMO (Phase 1)
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS replication_demo (
        id SERIAL PRIMARY KEY,
        test_value TEXT NOT NULL,
        written_at TIMESTAMP DEFAULT now()
      );
    `);

    // ==========================================
    // FOOD EMBEDDINGS (vector search)
    // ==========================================
    await client.query(`
      CREATE TABLE IF NOT EXISTS food_embeddings (
        id SERIAL PRIMARY KEY,
        food_name VARCHAR(255) NOT NULL,
        restaurant_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        embedding vector(128) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS food_embeddings_vector_idx
        ON food_embeddings
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 5);
      `);
      console.log('✅ Vector index created');
    } catch {
      console.log('⚠️  Vector index skipped (not enough rows)');
    }

    console.log('✅ PostgreSQL Tables Initialized (with hash + range partitions)');
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL tables:', error);
    throw error;
  } finally {
    client.release();
  }
}