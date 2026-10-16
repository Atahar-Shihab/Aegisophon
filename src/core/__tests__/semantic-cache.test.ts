import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticVectorCache } from '../cache/semantic-cache';

describe('SemanticVectorCache', () => {
  let cache: SemanticVectorCache;

  beforeEach(() => {
    cache = SemanticVectorCache.getInstance();
    cache.clear();
  });

  it('generates normalized unit embedding vectors', () => {
    const vec = cache.generateEmbedding('How to reverse a linked list');
    expect(vec.length).toBe(128);

    // Sum of squares should equal 1.0 (unit vector)
    const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1.0, 2);
  });

  it('yields high cosine similarity for semantically similar prompts', () => {
    const vecA = cache.generateEmbedding('How do I reverse a linked list in TypeScript?');
    const vecB = cache.generateEmbedding('Reverse linked list in typescript example');
    const similarity = cache.cosineSimilarity(vecA, vecB);

    expect(similarity).toBeGreaterThanOrEqual(0.75);
  });

  it('yields low cosine similarity for unrelated prompts', () => {
    const vecA = cache.generateEmbedding('Write a recipe for chocolate chip cookies');
    const vecB = cache.generateEmbedding('Explain quantum entanglement and qubits');
    const similarity = cache.cosineSimilarity(vecA, vecB);

    expect(similarity).toBeLessThan(0.40);
  });

  it('stores and retrieves cached completions with sub-15ms hit', () => {
    cache.store({
      prompt: 'What is the speed of light?',
      response: 'The speed of light in vacuum is approximately 299,792,458 meters per second.',
      model: 'simulator-fast',
      promptTokens: 10,
      completionTokens: 20,
    });

    const result = cache.lookup('What is the speed of light?', 0.90);
    expect(result.hit).toBe(true);
    expect(result.entry?.response).toContain('299,792,458');
    expect(result.latencyMs).toBeLessThan(15);
  });
});
