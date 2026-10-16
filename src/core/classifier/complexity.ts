import { ModelTier } from '../types';

export interface ComplexityAnalysis {
  score: number; // 0.00 to 1.00
  tier: ModelTier;
  estimatedTokens: number;
  factors: {
    lengthFactor: number;
    reasoningFactor: number;
    codeDensityFactor: number;
    intentFactor: number;
  };
  detectedReasoningMarkers: string[];
  detectedCodeKeywords: string[];
  explanation: string;
}

const REASONING_MARKERS = [
  'step by step',
  'think step by step',
  'prove that',
  'mathematical proof',
  'derive',
  'counterexample',
  'theorem',
  'invariants',
  'formal verification',
  'trade-off analysis',
  'edge cases',
  'distributed consensus',
  'race condition',
  'deadlock',
  'memory leak',
  'asymptotic complexity',
  'time complexity',
  'space complexity',
  'big-o',
  'dynamic programming',
  'backtracking',
  'recursion relation',
];

const CODE_KEYWORDS = [
  'function',
  'interface',
  'class',
  'import',
  'export',
  'const',
  'let',
  'var',
  'return',
  'async',
  'await',
  'def ',
  'lambda',
  'struct',
  'impl',
  'enum',
  'public',
  'private',
  'protected',
  'throw',
  'catch',
  'try',
  'typedef',
  'namespace',
  'template',
  'vector<',
  'console.log',
  'print(',
];

const SIMPLE_INTENT_PATTERNS = [
  /^(hi|hello|hey|greetings|good morning|good evening|howdy)[\s\.\!\?]*$/i,
  /^what is (the )?(capital|weather|date|time)/i,
  /^translate (this |the following )?to /i,
  /^summarize (this|in \d+ bullet points|briefly)/i,
  /^(who is|who was|when was|define )/i,
  /^fix (spelling|typo|grammar)/i,
];

export class PromptComplexityClassifier {
  /**
   * Estimates token count (rough rule of thumb: 4 characters per token)
   */
  public static estimateTokens(text: string): number {
    if (!text || text.trim().length === 0) return 0;
    return Math.max(1, Math.ceil(text.trim().length / 4));
  }

  /**
   * Analyzes prompt complexity and returns classification metrics
   */
  public static analyze(
    prompt: string,
    tier1Cutoff = 0.35,
    tier2Cutoff = 0.70
  ): ComplexityAnalysis {
    const raw = prompt || '';
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    const tokenCount = this.estimateTokens(trimmed);

    if (trimmed.length === 0) {
      return {
        score: 0.05,
        tier: 'tier-1-fast',
        estimatedTokens: 0,
        factors: { lengthFactor: 0, reasoningFactor: 0, codeDensityFactor: 0, intentFactor: 0 },
        detectedReasoningMarkers: [],
        detectedCodeKeywords: [],
        explanation: 'Empty or trivial prompt routed to fast tier.',
      };
    }

    // 1. Length Factor (Sigmoid response centered around 250 tokens)
    // 50 tokens -> ~0.15, 250 tokens -> 0.50, 600 tokens -> ~0.90
    const lengthFactor = 1 / (1 + Math.exp(-(tokenCount - 200) / 100));

    // 2. Reasoning Marker Analysis
    const detectedReasoningMarkers: string[] = [];
    for (const marker of REASONING_MARKERS) {
      if (lower.includes(marker)) {
        detectedReasoningMarkers.push(marker);
      }
    }
    const reasoningFactor = Math.min(1.0, detectedReasoningMarkers.length * 0.28);

    // 3. Code & Syntax Density Analysis
    const detectedCodeKeywords: string[] = [];
    for (const kw of CODE_KEYWORDS) {
      if (lower.includes(kw)) {
        detectedCodeKeywords.push(kw);
      }
    }
    const hasCodeFences = (raw.match(/```/g) || []).length >= 2;
    const syntaxSymbols = (raw.match(/[{}[\]()<>=;]/g) || []).length;
    const symbolDensity = Math.min(1.0, syntaxSymbols / Math.max(20, tokenCount));

    const codeDensityFactor = Math.min(
      1.0,
      (hasCodeFences ? 0.35 : 0) +
        detectedCodeKeywords.length * 0.12 +
        symbolDensity * 0.4
    );

    // 4. Intent Classification (Negative weights for simple conversational queries)
    let intentFactor = 0.5; // neutral baseline
    for (const pattern of SIMPLE_INTENT_PATTERNS) {
      if (pattern.test(lower)) {
        intentFactor = 0.1;
        break;
      }
    }

    // Weighted aggregate score
    // Length: 25%, Reasoning: 35%, Code: 30%, Intent: 10%
    let compositeScore =
      0.25 * lengthFactor +
      0.35 * reasoningFactor +
      0.30 * codeDensityFactor +
      0.10 * intentFactor;

    // Hard clamps and overrides
    if (intentFactor === 0.1 && detectedReasoningMarkers.length === 0 && !hasCodeFences && detectedCodeKeywords.length === 0) {
      compositeScore = Math.min(compositeScore, 0.25);
    }
    if (detectedCodeKeywords.length >= 2 || hasCodeFences) {
      compositeScore = Math.max(compositeScore, 0.42);
    }
    if (detectedReasoningMarkers.length >= 2 || (hasCodeFences && reasoningFactor > 0.4)) {
      compositeScore = Math.max(compositeScore, 0.72);
    }

    const roundedScore = Math.max(0.01, Math.min(0.99, Number(compositeScore.toFixed(2))));

    let tier: ModelTier = 'tier-1-fast';
    let explanation = '';

    if (roundedScore >= tier2Cutoff) {
      tier = 'tier-3-deep';
      explanation = `Deep reasoning detected (${detectedReasoningMarkers.length} cognitive markers, high code/complexity density). Routed to Tier 3 Deep Reasoning.`;
    } else if (roundedScore >= tier1Cutoff) {
      tier = 'tier-2-balanced';
      explanation = `Balanced analytical complexity (${tokenCount} tokens, moderate syntactic structure). Routed to Tier 2 Balanced.`;
    } else {
      tier = 'tier-1-fast';
      explanation = `Low complexity conversational/extraction task (${tokenCount} tokens). Routed to Tier 1 Fast Edge for optimal latency & FinOps savings.`;
    }

    return {
      score: roundedScore,
      tier,
      estimatedTokens: tokenCount,
      factors: {
        lengthFactor: Number(lengthFactor.toFixed(2)),
        reasoningFactor: Number(reasoningFactor.toFixed(2)),
        codeDensityFactor: Number(codeDensityFactor.toFixed(2)),
        intentFactor: Number(intentFactor.toFixed(2)),
      },
      detectedReasoningMarkers,
      detectedCodeKeywords,
      explanation,
    };
  }
}
