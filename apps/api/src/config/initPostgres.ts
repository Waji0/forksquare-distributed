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

    console.log('✅ PostgreSQL Tables Initialized');
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL tables:', error);
  } finally {
    client.release();
  }
}