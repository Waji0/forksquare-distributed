import { pgPool } from './db';

export async function initPostgresTables() {
  const client = await pgPool.connect();
  try {
    // Create Users Table (Vertical Fragmentation prep)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Inventory Table (For Concurrency Control / Flash Sales)
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        item_id VARCHAR(255) UNIQUE NOT NULL,
        quantity INT NOT NULL DEFAULT 0,
        version INT NOT NULL DEFAULT 1
      );
    `);

    // Create Orders Table (Strict ACID)
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id),
        status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        total_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ PostgreSQL Tables Initialized');
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL tables:', error);
  } finally {
    client.release();
  }
}