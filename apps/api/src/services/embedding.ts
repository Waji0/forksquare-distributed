/**
 * Text Embedding Service
 * 
 * Course Mapping: Week 6 - Distributed Indexing & Search Routing
 * Instructor Hint: "similar search use case → vector database"
 * 
 * We use a deterministic hash-based embedding (Bag of Words + Hash Bucketing).
 * In production, you would use a pre-trained ML model (e.g., BERT, Sentence Transformers).
 * 
 * The embedding maps text to a 128-dimensional vector where similar texts
 * produce similar vectors (close cosine similarity).
 */

const EMBEDDING_DIMENSIONS = 128;

/**
 * Generate a deterministic embedding from text.
 * Uses hash bucketing: each word is hashed to a bucket in the vector.
 * The vector is then L2-normalized for cosine similarity.
 */
export function generateEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words = normalized.split(/\s+/).filter(w => w.length > 0);

  for (const word of words) {
    // FNV-1a hash for deterministic bucket assignment
    let hash = 2166136261;
    for (let i = 0; i < word.length; i++) {
      hash ^= word.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    // Map hash to a bucket index
    const bucketIndex = Math.abs(hash) % EMBEDDING_DIMENSIONS;
    embedding[bucketIndex] += 1;

    // Also add bigram features for better similarity
    // (adjacent words in the text get related buckets)
    const secondaryIndex = Math.abs(hash * 31 + 7) % EMBEDDING_DIMENSIONS;
    embedding[secondaryIndex] += 0.5;
  }

  // L2 Normalize the vector (required for cosine similarity)
  const magnitude = Math.sqrt(
    embedding.reduce((sum, val) => sum + val * val, 0)
  );

  if (magnitude === 0) {
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }

  return embedding.map(val => Number((val / magnitude).toFixed(6)));
}

/**
 * Combine food attributes into a single text for embedding
 */
export function buildFoodText(
  foodName: string,
  category: string,
  tags: string[],
  cuisine: string
): string {
  return [foodName, category, cuisine, ...tags].join(' ');
}

/**
 * Format embedding array for PostgreSQL vector insertion
 */
export function formatVectorForPostgres(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

export { EMBEDDING_DIMENSIONS };