import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pgPool } from '../config/db';
import { ApiError } from '../middlewares/errorHandler';
import { generateEmbedding, formatVectorForPostgres } from '../services/embedding';

// ==========================================
// Zod Schemas
// ==========================================
const searchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.string().optional(),
});

const addFoodSchema = z.object({
  foodName: z.string().min(2).max(100),
  restaurantName: z.string().min(2).max(100),
  category: z.string().min(2),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// ==========================================
// GET /api/similar/search?query=spicy chicken&limit=5
// ==========================================
/**
 * Vector Similarity Search
 * 
 * Flow:
 * 1. Convert search query text → embedding vector
 * 2. Use pgvector cosine distance operator (<=>) to find nearest neighbors
 * 3. Return top-K similar food items with similarity scores
 * 
 * Course Mapping: Week 6 - Search Routing & Distributed Indexing
 */
export async function searchSimilarFoods(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      throw new ApiError(400, 'Query parameter is required');
    }

    const { query, limit } = parsed.data;
    const topK = Math.min(20, Math.max(1, Number(limit) || 5));

    // Step 1: Generate embedding from search query
    const queryEmbedding = generateEmbedding(query);
    const vectorString = formatVectorForPostgres(queryEmbedding);

    // Step 2: Cosine similarity search using pgvector
    // The <=> operator computes cosine distance (0 = identical, 2 = opposite)
    // We convert to similarity: similarity = 1 - distance
    const result = await pgPool.query(
      `SELECT 
         food_name,
         restaurant_name,
         category,
         description,
         1 - (embedding <=> $1::vector) AS similarity
       FROM food_embeddings
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorString, topK]
    );

    res.json({
      success: true,
      data: {
        query,
        results: result.rows.map(row => ({
          foodName: row.food_name,
          restaurantName: row.restaurant_name,
          category: row.category,
          description: row.description,
          similarity: Number(Number(row.similarity).toFixed(4)),
        })),
        searchMethod: 'pgvector_cosine_similarity',
        dimensions: 128,
      },
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// POST /api/similar/add
// ==========================================
/**
 * Add a food item to the vector index
 */
export async function addFoodEmbedding(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = addFoodSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ApiError(400, parsed.error.errors[0]?.message ?? 'Validation failed');
    }

    const { foodName, restaurantName, category, description, tags } = parsed.data;

    // Build text and generate embedding
    const text = [foodName, category, ...(tags ?? [])].join(' ');
    const embedding = generateEmbedding(text);
    const vectorString = formatVectorForPostgres(embedding);

    const result = await pgPool.query(
      `INSERT INTO food_embeddings (food_name, restaurant_name, category, description, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)
       RETURNING id, food_name, restaurant_name, category`,
      [foodName, restaurantName, category, description ?? '', vectorString]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      embeddingDimensions: 128,
    });
  } catch (error) {
    next(error);
  }
}

// ==========================================
// GET /api/similar/stats
// ==========================================
export async function getVectorStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const countResult = await pgPool.query('SELECT COUNT(*) as count FROM food_embeddings');
    const sampleResult = await pgPool.query(
      'SELECT food_name, restaurant_name, category FROM food_embeddings LIMIT 5'
    );

    res.json({
      success: true,
      data: {
        totalEmbeddings: Number(countResult.rows[0].count),
        dimensions: 128,
        distanceMetric: 'cosine',
        indexType: 'ivfflat',
        sampleItems: sampleResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
}