// // import { pgPool } from './db';

// // export async function initPostgresTables() {
// //   const client = await pgPool.connect();
// //   try {
// //     // Create Users Table (Vertical Fragmentation prep)
// //     await client.query(`
// //       CREATE TABLE IF NOT EXISTS users (
// //         id SERIAL PRIMARY KEY,
// //         username VARCHAR(255) UNIQUE NOT NULL,
// //         email VARCHAR(255) UNIQUE NOT NULL,
// //         password_hash VARCHAR(255) NOT NULL,
// //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// //       );
// //     `);

// //     // Create Inventory Table (For Concurrency Control / Flash Sales)
// //     await client.query(`
// //       CREATE TABLE IF NOT EXISTS inventory (
// //         id SERIAL PRIMARY KEY,
// //         item_id VARCHAR(255) UNIQUE NOT NULL,
// //         quantity INT NOT NULL DEFAULT 0,
// //         version INT NOT NULL DEFAULT 1
// //       );
// //     `);

// //     // Create Orders Table (Strict ACID)
// //     await client.query(`
// //       CREATE TABLE IF NOT EXISTS orders (
// //         id SERIAL PRIMARY KEY,
// //         user_id INT REFERENCES users(id),
// //         status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
// //         total_amount DECIMAL(10, 2) NOT NULL,
// //         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// //       );
// //     `);
    
// //     console.log('✅ PostgreSQL Tables Initialized');
// //   } catch (error) {
// //     console.error('❌ Error initializing PostgreSQL tables:', error);
// //   } finally {
// //     client.release();
// //   }
// // }






// import { pgPool } from './db';

// export async function initPostgresTables() {
//   const client = await pgPool.connect();
//   try {
//     await client.query(`
//       CREATE TABLE IF NOT EXISTS users (
//         id SERIAL PRIMARY KEY,
//         username VARCHAR(255) UNIQUE NOT NULL,
//         email VARCHAR(255) UNIQUE NOT NULL,
//         password_hash VARCHAR(255) NOT NULL,
//         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

//     // NEW: Event Log Table for Async Consumers
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
    // Enable pgvector extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log('✅ pgvector extension enabled');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Phase 0: Add role column for RBAC
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';
    `);

    // Phase 0: Refresh tokens table for proper token lifecycle
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

    // Phase 0: Index for fast refresh token lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
      ON refresh_tokens(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
      ON refresh_tokens(token_hash);
    `);

    // Phase 1: Table used to demonstrate replication lag
    await client.query(`
      CREATE TABLE IF NOT EXISTS replication_demo (
        id SERIAL PRIMARY KEY,
        test_value TEXT NOT NULL,
        written_at TIMESTAMP DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_id VARCHAR(255) UNIQUE NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        version INT NOT NULL DEFAULT 1
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        total_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    // NEW: Food Embeddings Table for Vector Similarity Search
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

    // Create index for faster similarity search (IVFFlat)
    // Note: Index creation may fail with very few rows, so we wrap in try/catch
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS food_embeddings_vector_idx 
        ON food_embeddings 
        USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 5);
      `);
      console.log('✅ Vector index created');
    } catch {
      console.log('⚠️  Vector index skipped (not enough rows for IVFFlat)');
    }

    // NEW: Cart Items Table
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

    // NEW: Order Tracking Status History
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id INT NOT NULL REFERENCES orders(id),
        status VARCHAR(50) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        note TEXT DEFAULT ''
      );
    `);

    console.log('✅ PostgreSQL Tables Initialized');
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL tables:', error);
  } finally {
    client.release();
  }
}