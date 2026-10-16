# ADR 003: Semantic Vector Caching & FinOps Cost Governance Ledger

## Status
Accepted

## Context
Across enterprise LLM workloads, many prompts are semantically equivalent despite slight variations in phrasing, punctuation, or formatting (e.g., "How do I reverse a linked list in TypeScript?" vs "Reverse linked list typescript example"). Standard exact-string caching misses 90%+ of these identical queries, re-incurring upstream model API costs ($1.50 - $15.00 per million tokens) and latency (500ms - 2,500ms).

## Decision
1. **Semantic Caching via Cosine Similarity:**
   - Every prompt query produces a normalized embedding vector (using local semantic hashing / fast embedding feature projection).
   - Incoming vectors are compared against an in-memory/cache index of active cached queries.
   - If Cosine Similarity $\cos(\theta) \ge \tau$ (where default threshold $\tau = 0.92$), the request is treated as a **Semantic Cache HIT**.
   - Return cached response immediately with `X-Aegis-Cache: HIT`, latency $< 15\text{ms}$, and $0.00 actual cost.
2. **FinOps Ledger Accounting:**
   - Token usage (input tokens, output tokens) is tracked for every request.
   - For every request, calculate:
     - $\text{Actual Cost}$: Based on the model tier routed to or $\$0.00$ for cache hits.
     - $\text{Frontier Cost Baseline}$: Hypothetical cost if routed exclusively to an expensive flagship frontier model (e.g. Claude 3.7 / GPT-4o @ \$2.50 / \$10.00 per M tokens).
     - $\text{Dollars Saved} = \text{Frontier Cost Baseline} - \text{Actual Cost}$.
   - Telemetry tracks cumulative savings from both MoE Down-Routing and Semantic Caching.

## Consequences
- **Positive:** Cache hit queries return in $< 15\text{ms}$ (a 98% latency reduction) with zero upstream token expenditure.
- **Negative:** Memory consumption for in-memory vector index. Mitigated with an LRU eviction policy (maximum 10,000 entries).
