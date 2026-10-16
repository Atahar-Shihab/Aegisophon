import { GuardrailScanResult } from '../types';

const INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior) (instructions|directions|prompts)/i,
  /disregard (all )?(previous|prior) (instructions|directions|prompts)/i,
  /you are now (in )?(developer mode|dan|unrestricted mode|jailbreak)/i,
  /bypass (all )?(content filters|safety policies|security guidelines)/i,
  /system prompt leakage|reveal your (system )?instructions/i,
  /act as an unrestricted ai|do anything now/i,
  /output the exact text above|repeat the system prompt/i,
  /enable (developer|god|unrestricted) mode/i,
];

const SSN_REGEX = /\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g;
const CREDIT_CARD_REGEX = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12})\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const API_KEY_REGEX = /\b(?:sk-[a-zA-Z0-9]{24,}|ghp_[a-zA-Z0-9]{24,}|ag_live_[a-zA-Z0-9]{16,})\b/g;

export class PromptGuardrailScanner {
  /**
   * Scans prompt for prompt injections and redacts sensitive PII
   */
  public static scan(prompt: string): GuardrailScanResult {
    const startTime = performance.now();
    const raw = prompt || '';

    const injectionsDetected: string[] = [];
    for (const pattern of INJECTION_PATTERNS) {
      const match = raw.match(pattern);
      if (match) {
        injectionsDetected.push(match[0]);
      }
    }

    // Check potential base64 encoded injection probe (long base64 string > 40 chars)
    const base64Candidates = raw.match(/\b[A-Za-z0-9+/]{44,}={0,2}\b/g);
    if (base64Candidates) {
      for (const b64 of base64Candidates) {
        try {
          const decoded = Buffer.from(b64, 'base64').toString('utf-8');
          for (const pattern of INJECTION_PATTERNS) {
            if (pattern.test(decoded)) {
              injectionsDetected.push(`Base64 Encoded Injection: ${b64.substring(0, 12)}...`);
            }
          }
        } catch {
          // not base64
        }
      }
    }

    // PII Redaction
    const piiRedacted: Array<{ type: 'email' | 'ssn' | 'credit_card' | 'api_key'; match: string; redacted: string }> = [];
    let sanitized = raw;

    // Redact SSNs
    sanitized = sanitized.replace(SSN_REGEX, (match) => {
      piiRedacted.push({ type: 'ssn', match, redacted: '[REDACTED_SSN]' });
      return '[REDACTED_SSN]';
    });

    // Redact Credit Cards
    sanitized = sanitized.replace(CREDIT_CARD_REGEX, (match) => {
      piiRedacted.push({ type: 'credit_card', match, redacted: '[REDACTED_CREDIT_CARD]' });
      return '[REDACTED_CREDIT_CARD]';
    });

    // Redact API Keys
    sanitized = sanitized.replace(API_KEY_REGEX, (match) => {
      piiRedacted.push({ type: 'api_key', match, redacted: '[REDACTED_API_KEY]' });
      return '[REDACTED_API_KEY]';
    });

    // Redact Emails
    sanitized = sanitized.replace(EMAIL_REGEX, (match) => {
      piiRedacted.push({ type: 'email', match, redacted: '[REDACTED_EMAIL]' });
      return '[REDACTED_EMAIL]';
    });

    // Risk score calculation
    let riskScore = 0.0;
    if (injectionsDetected.length > 0) {
      riskScore += 0.85;
    }
    if (piiRedacted.length > 0) {
      riskScore += Math.min(0.5, piiRedacted.length * 0.15);
    }
    riskScore = Math.min(1.0, Number(riskScore.toFixed(2)));

    const blocked = injectionsDetected.length > 0;
    const passed = !blocked;
    const latencyMs = Number((performance.now() - startTime).toFixed(2));

    return {
      passed,
      blocked,
      injectionsDetected,
      piiRedacted,
      sanitizedPrompt: sanitized,
      riskScore,
      latencyMs,
    };
  }
}
