import { ChaosConfig } from '../types';

export interface ProviderExecutionResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export class DeterministicSimulator {
  /**
   * Generates a contextually rich response based on the prompt's theme
   */
  public static generateRealisticContent(prompt: string, model: string): string {
    const p = prompt.toLowerCase();

    if (p.includes('reverse') && p.includes('linked list')) {
      return `To reverse a singly linked list in TypeScript iteratively with $O(n)$ time and $O(1)$ auxiliary space complexity:

\`\`\`typescript
class ListNode<T> {
  value: T;
  next: ListNode<T> | null = null;
  constructor(value: T, next: ListNode<T> | null = null) {
    this.value = value;
    this.next = next;
  }
}

export function reverseLinkedList<T>(head: ListNode<T> | null): ListNode<T> | null {
  let prev: ListNode<T> | null = null;
  let curr: ListNode<T> | null = head;

  while (curr !== null) {
    const nextTemp: ListNode<T> | null = curr.next;
    curr.next = prev;
    prev = curr;
    curr = nextTemp;
  }

  return prev;
}
\`\`\`

### Invariants & Proof of Correctness
1. **Loop Invariant:** At the start of each iteration, \`prev\` points to the head of the reversed prefix of nodes, and \`curr\` points to the head of the unreversed remainder.
2. **Termination:** Guaranteed because the pointer traverses monotonically towards \`null\`.`;
    }

    if (p.includes('circuit breaker') || p.includes('distributed')) {
      return `### Distributed Circuit Breaker Pattern Architecture

In high-concurrency microservices, an upstream failure must be isolated to prevent thread starvation and cascaded brownouts.

1. **CLOSED State:** All calls pass through to the upstream provider while sliding-window metrics track error percentage.
2. **OPEN State:** Short-circuits all calls immediately without network I/O, routing immediately to localized fallback caches.
3. **HALF_OPEN State:** After cooldown expiry, probe canaries measure upstream recovery with strict zero-tolerance failure criteria.`;
    }

    if (p.includes('translate') || p.includes('french') || p.includes('spanish')) {
      return `Here is the requested high-fidelity translation:
> *"L'architecture logicielle distribuée requiert une observabilité en temps réel et des mécanismes de tolérance aux pannes."*`;
    }

    if (p.includes('hi') || p.includes('hello') || p.includes('hey')) {
      return `Hello! I am connected via the **AegisGateway** intelligent semantic mesh. How can I assist you with your architecture, engineering pipelines, or coding tasks today?`;
    }

    // Default analytical completion
    return `### AegisGateway Execution Analysis (${model})

- **Input Prompt Assessment:** Processed successfully through the MoE Routing Mesh.
- **Provider Status:** Executed on healthy cluster node.
- **Syntactic Decomposition:** Validated syntax parameters and context bounds.
- **Semantic Coherence:** 0.985 confidence index.

\`\`\`json
{
  "status": "success",
  "engine": "${model}",
  "routingOptimization": "enabled",
  "circuitMesh": "CLOSED_HEALTHY"
}
\`\`\``;
  }

  /**
   * Executes a simulated call, respecting injected chaos and realistic delays
   */
  public static async execute(params: {
    prompt: string;
    model: string;
    chaosConfig?: ChaosConfig;
    simulateLatency?: boolean;
  }): Promise<ProviderExecutionResult> {
    const startTime = performance.now();
    const { prompt, model, chaosConfig, simulateLatency = true } = params;

    // 1. Chaos Forced Error Injection
    if (chaosConfig?.active && chaosConfig.forcedErrorCode) {
      if (chaosConfig.forcedErrorCode === 429) {
        throw new Error('HTTP 429 Too Many Requests: Upstream provider rate limit exceeded');
      }
      if (chaosConfig.forcedErrorCode === 503) {
        throw new Error('HTTP 503 Service Unavailable: Upstream provider cluster experiencing outage');
      }
      throw new Error(`HTTP ${chaosConfig.forcedErrorCode} Internal Provider Error`);
    }

    // 2. Latency Injection (either forced chaos latency or realistic base latency)
    let delayMs = 0;
    if (chaosConfig?.active && (chaosConfig.forcedLatencyMs ?? 0) > 0) {
      delayMs = chaosConfig.forcedLatencyMs!;
    } else if (simulateLatency) {
      // Faster models (Flash/Haiku) take 80-180ms, larger take 250-450ms
      delayMs = model.includes('flash') || model.includes('fast') ? 100 : 250;
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const responseText = this.generateRealisticContent(prompt, model);
    const promptTokens = Math.max(1, Math.ceil(prompt.length / 4));
    const completionTokens = Math.max(1, Math.ceil(responseText.length / 4));
    const totalLatency = Number((performance.now() - startTime).toFixed(1));

    return {
      text: responseText,
      promptTokens,
      completionTokens,
      latencyMs: totalLatency,
    };
  }

  /**
   * Token-by-token streaming generator for realistic SSE simulation
   */
  public static async *streamTokens(params: {
    prompt: string;
    model: string;
    chaosConfig?: ChaosConfig;
  }): AsyncGenerator<string, void, unknown> {
    const { prompt, model, chaosConfig } = params;

    if (chaosConfig?.active && chaosConfig.forcedErrorCode) {
      throw new Error(`HTTP ${chaosConfig.forcedErrorCode} Upstream Fault Injected`);
    }

    if (chaosConfig?.active && (chaosConfig.forcedLatencyMs ?? 0) > 0) {
      await new Promise((resolve) => setTimeout(resolve, chaosConfig.forcedLatencyMs!));
    }

    const fullText = this.generateRealisticContent(prompt, model);
    const words = fullText.split(' ');

    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      yield chunk;
      // Realistic stream interval (15-30ms per word token)
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}
