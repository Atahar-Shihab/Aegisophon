import { describe, it, expect } from 'vitest';
import { PromptComplexityClassifier } from '../classifier/complexity';

describe('PromptComplexityClassifier', () => {
  it('classifies simple conversational greeting into Tier 1 Fast', () => {
    const result = PromptComplexityClassifier.analyze('Hello, good morning!');
    expect(result.tier).toBe('tier-1-fast');
    expect(result.score).toBeLessThan(0.35);
  });

  it('classifies entity extraction or translation into Tier 1 Fast', () => {
    const result = PromptComplexityClassifier.analyze('Translate this word to Spanish: apple');
    expect(result.tier).toBe('tier-1-fast');
    expect(result.score).toBeLessThan(0.35);
  });

  it('classifies moderate coding and structural task into Tier 2 Balanced', () => {
    const prompt = 'Can you write a TypeScript interface for a user profile and an async function to fetch it?';
    const result = PromptComplexityClassifier.analyze(prompt);
    expect(result.tier).toBe('tier-2-balanced');
    expect(result.score).toBeGreaterThanOrEqual(0.35);
    expect(result.score).toBeLessThan(0.70);
    expect(result.detectedCodeKeywords).toContain('interface');
    expect(result.detectedCodeKeywords).toContain('async');
  });

  it('classifies deep multi-step algorithmic proof and code into Tier 3 Deep Reasoning', () => {
    const prompt = `Please provide a mathematical proof and time complexity analysis for reverse singly linked list.
Think step by step and prove that the loop invariant holds. Discuss edge cases, invariants, and counterexamples.
\`\`\`typescript
function reverse(head: ListNode): ListNode {}
\`\`\``;
    const result = PromptComplexityClassifier.analyze(prompt);
    expect(result.tier).toBe('tier-3-deep');
    expect(result.score).toBeGreaterThanOrEqual(0.70);
    expect(result.detectedReasoningMarkers.length).toBeGreaterThan(0);
  });
});
