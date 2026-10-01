import mongoose from 'mongoose';
import { Pool } from 'pg';
import 'dotenv/config';
import { Restaurant } from '../models/Restaurant';
import { bloomAddBulk } from '../services/bloomFilter';
import { redisClient } from '../config/db';
import { generateEmbedding, formatVectorForPostgres, buildFoodText } from '../services/embedding';

import { neo4jDriver } from '../config/neo4j';
import { seedGraph } from '../services/graph';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/forksquare_menus';
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://forksquare:forksquare_secret@localhost:5432/forksquare_orders';

// ==========================================
// Restaurant Seed Data (MongoDB)
// ==========================================
const restaurantSeedData = [
  {
    name: 'Karachi BBQ House', cuisine: 'BBQ & Grill', category: 'bbq', rating: 4.8,
    deliveryTime: '25-35 min', deliveryFee: 'Free',
    tags: ['Seekh Kebab', 'Karahi', 'Naan', 'Tikka'], emoji: '🍢',
    gradient: 'from-orange-500 via-red-500 to-rose-500', featured: true,
  },
  {
    name: 'Pizza Square', cuisine: 'Italian', category: 'pizza', rating: 4.6,
    deliveryTime: '20-30 min', deliveryFee: 'Rs. 49',
    tags: ['Thin Crust', 'Cheese Burst', 'Pepperoni', 'Dip'], emoji: '🍕',
    gradient: 'from-amber-400 via-orange-500 to-red-500', featured: true,
  },
  {
    name: 'Green Bowl', cuisine: 'Healthy', category: 'healthy', rating: 4.7,
    deliveryTime: '15-25 min', deliveryFee: 'Free',
    tags: ['Salad', 'Protein Bowl', 'Low Carb', 'Smoothie'], emoji: '🥗',
    gradient: 'from-emerald-400 via-green-500 to-teal-500', featured: true,
  },
  {
    name: 'Sweet Circle', cuisine: 'Dessert', category: 'dessert', rating: 4.9,
    deliveryTime: '15-20 min', deliveryFee: 'Rs. 29',
    tags: ['Cake', 'Ice Cream', 'Brownie', 'Cheesecake'], emoji: '🍰',
    gradient: 'from-pink-400 via-fuchsia-500 to-purple-500', featured: false,
  },
  {
    name: 'Desi Handi', cuisine: 'Pakistani', category: 'traditional', rating: 4.5,
    deliveryTime: '30-40 min', deliveryFee: 'Free',
    tags: ['Biryani', 'Handi', 'Roti', 'Nihari'], emoji: '🍛',
    gradient: 'from-yellow-400 via-amber-500 to-orange-600', featured: false,
  },
  {
    name: 'Midnight Munchies', cuisine: 'Fast Food', category: 'pizza', rating: 4.3,
    deliveryTime: '10-20 min', deliveryFee: 'Rs. 19',
    tags: ['Burger', 'Fries', 'Late Night', 'Shake'], emoji: '🍔',
    gradient: 'from-indigo-500 via-violet-500 to-purple-600', featured: false,
  },
  {
    name: 'Sushi Wave', cuisine: 'Japanese', category: 'healthy', rating: 4.4,
    deliveryTime: '30-45 min', deliveryFee: 'Rs. 99',
    tags: ['Sushi', 'Ramen', 'Tempura', 'Miso'], emoji: '🍣',
    gradient: 'from-cyan-400 via-blue-500 to-indigo-500', featured: false,
  },
  {
    name: 'Taco Fiesta', cuisine: 'Mexican', category: 'traditional', rating: 4.2,
    deliveryTime: '20-30 min', deliveryFee: 'Rs. 39',
    tags: ['Tacos', 'Burrito', 'Nachos', 'Salsa'], emoji: '🌮',
    gradient: 'from-lime-400 via-green-500 to-emerald-600', featured: false,
  },
  {
    name: 'Noodle Nation', cuisine: 'Chinese', category: 'traditional', rating: 4.6,
    deliveryTime: '25-35 min', deliveryFee: 'Free',
    tags: ['Noodles', 'Fried Rice', 'Dumplings', 'Wonton'], emoji: '🍜',
    gradient: 'from-red-400 via-rose-500 to-pink-600', featured: true,
  },
  {
    name: 'Cream & Sugar', cuisine: 'Cafe', category: 'dessert', rating: 4.7,
    deliveryTime: '10-15 min', deliveryFee: 'Rs. 19',
    tags: ['Coffee', 'Croissant', 'Latte', 'Muffin'], emoji: '☕',
    gradient: 'from-amber-300 via-yellow-400 to-orange-400', featured: false,
  },
];

// ==========================================
// Inventory Seed Data (PostgreSQL)
// ==========================================
const inventorySeedData = [
  { item_id: 'item_bbq_1', quantity: 100 },
  { item_id: 'item_bbq_2', quantity: 80 },
  { item_id: 'item_pizza_1', quantity: 150 },
  { item_id: 'item_pizza_2', quantity: 120 },
  { item_id: 'item_healthy_1', quantity: 60 },
  { item_id: 'item_healthy_2', quantity: 45 },
  { item_id: 'item_dessert_1', quantity: 200 },
  { item_id: 'item_traditional_1', quantity: 90 },
  { item_id: 'item_traditional_2', quantity: 75 },
  { item_id: 'item_fast_1', quantity: 5 },
  { item_id: 'flash_burger_gold', quantity: 1 },
];

// ==========================================
// Food Items for Vector Embeddings (NEW)
// ==========================================
const foodItemsForEmbedding = [
  { foodName: 'Chicken Biryani', restaurantName: 'Desi Handi', category: 'traditional', cuisine: 'Pakistani', tags: ['rice', 'spicy', 'chicken', 'aromatic', 'fragrant'] },
  { foodName: 'Seekh Kebab Platter', restaurantName: 'Karachi BBQ House', category: 'bbq', cuisine: 'BBQ & Grill', tags: ['grilled', 'beef', 'spicy', 'charcoal', 'smoky'] },
  { foodName: 'Margherita Pizza', restaurantName: 'Pizza Square', category: 'pizza', cuisine: 'Italian', tags: ['cheese', 'tomato', 'italian', 'thin crust', 'fresh'] },
  { foodName: 'Protein Power Bowl', restaurantName: 'Green Bowl', category: 'healthy', cuisine: 'Healthy', tags: ['salad', 'protein', 'low carb', 'fresh', 'nutritious'] },
  { foodName: 'Chocolate Lava Cake', restaurantName: 'Sweet Circle', category: 'dessert', cuisine: 'Dessert', tags: ['chocolate', 'sweet', 'warm', 'rich', 'indulgent'] },
  { foodName: 'Dragon Roll Sushi', restaurantName: 'Sushi Wave', category: 'healthy', cuisine: 'Japanese', tags: ['japanese', 'raw fish', 'rice', 'seaweed', 'fresh'] },
  { foodName: 'Beef Tacos', restaurantName: 'Taco Fiesta', category: 'traditional', cuisine: 'Mexican', tags: ['mexican', 'spicy', 'beef', 'tortilla', 'crunchy'] },
  { foodName: 'Wonton Noodle Soup', restaurantName: 'Noodle Nation', category: 'traditional', cuisine: 'Chinese', tags: ['chinese', 'soup', 'noodles', 'comfort', 'warm'] },
  { foodName: 'Caramel Latte', restaurantName: 'Cream & Sugar', category: 'dessert', cuisine: 'Cafe', tags: ['coffee', 'sweet', 'warm', 'creamy', 'aromatic'] },
  { foodName: 'Pepperoni Feast Pizza', restaurantName: 'Pizza Square', category: 'pizza', cuisine: 'Italian', tags: ['pepperoni', 'cheese', 'meat', 'italian', 'loaded'] },
  { foodName: 'Mutton Karahi', restaurantName: 'Karachi BBQ House', category: 'bbq', cuisine: 'BBQ & Grill', tags: ['spicy', 'mutton', 'tomato', 'traditional', 'rich'] },
  { foodName: 'Caesar Salad', restaurantName: 'Green Bowl', category: 'healthy', cuisine: 'Healthy', tags: ['lettuce', 'croutons', 'dressing', 'light', 'crisp'] },
  { foodName: 'Red Velvet Cake', restaurantName: 'Sweet Circle', category: 'dessert', cuisine: 'Dessert', tags: ['cake', 'cream cheese', 'sweet', 'festive', 'moist'] },
  { foodName: 'Chicken Tikka Masala', restaurantName: 'Desi Handi', category: 'traditional', cuisine: 'Pakistani', tags: ['curry', 'chicken', 'creamy', 'spicy', 'aromatic'] },
  { foodName: 'BBQ Chicken Pizza', restaurantName: 'Pizza Square', category: 'pizza', cuisine: 'Italian', tags: ['bbq', 'chicken', 'cheese', 'smoky', 'grilled'] },
  { foodName: 'Spicy Ramen Bowl', restaurantName: 'Sushi Wave', category: 'healthy', cuisine: 'Japanese', tags: ['japanese', 'noodles', 'spicy', 'soup', 'umami'] },
  { foodName: 'Loaded Nachos', restaurantName: 'Taco Fiesta', category: 'traditional', cuisine: 'Mexican', tags: ['mexican', 'cheese', 'crunchy', 'spicy', 'sharing'] },
  { foodName: 'Fried Rice Special', restaurantName: 'Noodle Nation', category: 'traditional', cuisine: 'Chinese', tags: ['chinese', 'rice', 'egg', 'vegetables', 'savory'] },
  { foodName: 'Classic Cheeseburger', restaurantName: 'Midnight Munchies', category: 'pizza', cuisine: 'Fast Food', tags: ['burger', 'cheese', 'beef', 'juicy', 'comfort'] },
  { foodName: 'Iced Mocha Frappe', restaurantName: 'Cream & Sugar', category: 'dessert', cuisine: 'Cafe', tags: ['coffee', 'cold', 'sweet', 'chocolate', 'refreshing'] },
];

// ==========================================
// Seed Users for Bloom Filter
// ==========================================
const seedUsernames = ['admin', 'testuser', 'foodlover', 'karachieats', 'pizzafan'];

// ==========================================
// Seed Function
// ==========================================
async function seed() {
  console.log('🌱 Starting database seeding...\n');

  // 1. Seed MongoDB (Restaurants)
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    await Restaurant.deleteMany({});
    console.log('🗑️  Cleared existing restaurants');
    const inserted = await Restaurant.insertMany(restaurantSeedData);
    console.log(`📦 Inserted ${inserted.length} restaurants into MongoDB\n`);
  } catch (error) {
    console.error('❌ MongoDB seed error:', error);
    process.exit(1);
  }

  // 2. Seed PostgreSQL (Inventory + Food Embeddings)
  const pgPool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pgPool.connect();
    console.log('✅ Connected to PostgreSQL');

    // Clear and seed inventory
    await client.query('DELETE FROM inventory');
    console.log('🗑️  Cleared existing inventory');

    for (const item of inventorySeedData) {
      await client.query(
        `INSERT INTO inventory (item_id, quantity, version) VALUES ($1, $2, 1)
         ON CONFLICT (item_id) DO UPDATE SET quantity = $2, version = 1`,
        [item.item_id, item.quantity]
      );
    }
    console.log(`📦 Inserted ${inventorySeedData.length} inventory items\n`);

    // NEW: Clear and seed food embeddings
    await client.query('DELETE FROM food_embeddings');
    console.log('🗑️  Cleared existing food embeddings');

    for (const food of foodItemsForEmbedding) {
      const text = buildFoodText(food.foodName, food.category, food.tags, food.cuisine);
      const embedding = generateEmbedding(text);
      const vectorString = formatVectorForPostgres(embedding);

      await client.query(
        `INSERT INTO food_embeddings (food_name, restaurant_name, category, description, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)`,
        [
          food.foodName,
          food.restaurantName,
          food.category,
          `Tags: ${food.tags.join(', ')} | Cuisine: ${food.cuisine}`,
          vectorString,
        ]
      );
    }
    console.log(`🧬 Generated and inserted ${foodItemsForEmbedding.length} food embeddings (128-dim vectors)\n`);

    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL seed error:', error);
    process.exit(1);
  } finally {
    await pgPool.end();
  }

  // Seed an admin user for RBAC testing
  try {
    const bcrypt = await import('bcryptjs');
    const adminPasswordHash = await bcrypt.hash('admin_password_123', 12);

    const client = await pgPool.connect();
    await client.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET role = $4`,
      ['admin', 'admin@forksquare.com', adminPasswordHash, 'admin']
    );
    client.release();
    console.log('👤 Admin user seeded: admin@forksquare.com / admin_password_123');
  } catch (error) {
    console.error('❌ Admin seed error:', error);
  }

  // 3. Populate Bloom Filter
  try {
    await bloomAddBulk(seedUsernames);
    console.log(`🌸 Bloom Filter populated with ${seedUsernames.length} usernames\n`);
  } catch (error) {
    console.error('❌ Bloom filter seed error:', error);
  }

  // 4. Seed Neo4j Graph
  try {
    console.log('🔗 Seeding Neo4j Graph...');
    await seedGraph(restaurantSeedData.map(r => ({
      name: r.name,
      cuisine: r.cuisine,
      category: r.category,
      rating: r.rating,
    })));
  } catch (error) {
    console.error('❌ Neo4j seed error:', error);
  }

  // 5. Cleanup
  await mongoose.disconnect();
  await redisClient.quit();
  await neo4jDriver.close();

  console.log('🎉 Database seeding completed successfully!');
  process.exit(0);
}

seed();