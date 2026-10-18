import { describe, it, expect } from 'vitest';
import {
  generateEmbedding,
  formatVectorForPostgres,
  buildFoodText,
  EMBEDDING_DIMENSIONS,
} from '../embedding';

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

describe('Embedding Service (Week 6: Vector Search)', () => {
  it('should generate an embedding of correct dimensions', () => {
    const embedding = generateEmbedding('spicy chicken biryani');
    expect(embedding).toHaveLength(EMBEDDING_DIMENSIONS);
  });

  it('should be deterministic (same input = same output)', () => {
    const e1 = generateEmbedding('chicken biryani');
    const e2 = generateEmbedding('chicken biryani');
    expect(e1).toEqual(e2);
  });

  it('should produce L2-normalized vectors (magnitude ≈ 1)', () => {
    const embedding = generateEmbedding('spicy grilled kebab charcoal');
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 1);
  });

  it('should produce higher similarity for related foods than unrelated foods', () => {
    const spicyRice1 = generateEmbedding('spicy chicken biryani rice aromatic');
    const spicyRice2 = generateEmbedding('spicy chicken pulao rice aromatic');
    const dessert = generateEmbedding('chocolate sweet cake dessert creamy');

    const similarPair = cosineSimilarity(spicyRice1, spicyRice2);
    const dissimilarPair = cosineSimilarity(spicyRice1, dessert);

    expect(similarPair).toBeGreaterThan(dissimilarPair);
  });

  it('should return zero vector for empty input', () => {
    const embedding = generateEmbedding('');
    expect(embedding).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(embedding.every((v) => v === 0)).toBe(true);
  });

  it('should format vector for PostgreSQL pgvector syntax', () => {
    const formatted = formatVectorForPostgres([0.1, 0.2, 0.3]);
    expect(formatted).toBe('[0.1,0.2,0.3]');
  });

  it('should build food text from all attributes', () => {
    const text = buildFoodText('Biryani', 'traditional', ['spicy', 'rice'], 'Pakistani');
    expect(text).toContain('Biryani');
    expect(text).toContain('traditional');
    expect(text).toContain('spicy');
    expect(text).toContain('rice');
    expect(text).toContain('Pakistani');
  });
});