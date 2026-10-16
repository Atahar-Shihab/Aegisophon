export interface CachedEntry {
  id: string;
  prompt: string;
  vector: number[];
  response: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface CacheLookupResult {
  hit: boolean;
  similarity: number;
  entry?: CachedEntry;
  latencyMs: number;
}

const VECTOR_DIMENSIONS = 128;

export class SemanticVectorCache {
  private static instance: SemanticVectorCache;
  private cache: Map<string, CachedEntry> = new Map();
  private maxCapacity = 5000;
  private defaultTtlMs = 60 * 60 * 1000; // 1 hour

  public static getInstance(): SemanticVectorCache {
    if (!SemanticVectorCache.instance) {
      SemanticVectorCache.instance = new SemanticVectorCache();
    }
    return SemanticVectorCache.instance;
  }

  /**
   * Generates a 128-dimensional deterministic semantic feature vector
   * using character 3-grams, token bags, and locality-sensitive hashing.
   */
  public generateEmbedding(text: string): number[] {
    const vector = new Array(VECTOR_DIMENSIONS).fill(0);
    if (!text || text.trim().length === 0) return vector;

    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = normalized.split(' ');

    // 1. Word frequency projection
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = (hash * 31 + word.charCodeAt(j)) >>> 0;
      }
      const dim = hash % VECTOR_DIMENSIONS;
      vector[dim] += 1.0;
    }

    // 2. Character 3-gram projection (captures morphology, stem similarity, typos)
    for (let i = 0; i <= normalized.length - 3; i++) {
      const trigram = normalized.slice(i, i + 3);
      let hash = 0;
      for (let j = 0; j < 3; j++) {
        hash = (hash * 37 + trigram.charCodeAt(j)) >>> 0;
      }
      const dim = hash % VECTOR_DIMENSIONS;
      vector[dim] += 0.4;
    }

    // 3. Length signature in last 4 dimensions
    const lengthNorm = Math.min(1.0, words.length / 50);
    vector[VECTOR_DIMENSIONS - 1] = lengthNorm;
    vector[VECTOR_DIMENSIONS - 2] = Math.min(1.0, normalized.length / 300);

    // 4. L2 Normalization so magnitude = 1.0
    let sumSq = 0;
    for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
      sumSq += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSq) || 1.0;
    for (let i = 0; i < VECTOR_DIMENSIONS; i++) {
      vector[i] = Number((vector[i] / norm).toFixed(6));
    }

    return vector;
  }

  /**
   * Calculates cosine similarity between two unit vectors: u • v
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(0, Math.min(1.0, Number(dot.toFixed(4))));
  }

  /**
   * Performs semantic lookup against active cached prompts
   */
  public lookup(prompt: string, threshold = 0.92): CacheLookupResult {
    const startTime = performance.now();
    const now = Date.now();
    const queryVector = this.generateEmbedding(prompt);

    let bestSimilarity = 0;
    let bestEntry: CachedEntry | undefined;
    const expiredIds: string[] = [];

    this.cache.forEach((entry, id) => {
      if (entry.expiresAt <= now) {
        expiredIds.push(id);
        return;
      }

      const similarity = this.cosineSimilarity(queryVector, entry.vector);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestEntry = entry;
      }
    });

    for (let i = 0; i < expiredIds.length; i++) {
      this.cache.delete(expiredIds[i]);
    }

    const duration = Number((performance.now() - startTime).toFixed(2));

    if (bestEntry && bestSimilarity >= threshold) {
      bestEntry.hitCount++;
      return {
        hit: true,
        similarity: bestSimilarity,
        entry: bestEntry,
        latencyMs: duration,
      };
    }

    return {
      hit: false,
      similarity: bestSimilarity,
      latencyMs: duration,
    };
  }

  /**
   * Stores a response in the semantic cache
   */
  public store(params: {
    prompt: string;
    response: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    ttlMs?: number;
  }): CachedEntry {
    const now = Date.now();
    const vector = this.generateEmbedding(params.prompt);
    const id = `cache_${Math.random().toString(36).substring(2, 11)}`;

    // LRU eviction if capacity exceeded
    if (this.cache.size >= this.maxCapacity) {
      const oldestKey = Array.from(this.cache.keys())[0];
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const entry: CachedEntry = {
      id,
      prompt: params.prompt,
      vector,
      response: params.response,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      createdAt: now,
      expiresAt: now + (params.ttlMs ?? this.defaultTtlMs),
      hitCount: 0,
    };

    this.cache.set(id, entry);
    return entry;
  }

  public size(): number {
    return this.cache.size;
  }

  public clear(): void {
    this.cache.clear();
  }
}
