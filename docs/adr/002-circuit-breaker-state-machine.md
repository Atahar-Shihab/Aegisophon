# ADR 002: Fault-Tolerant Circuit Breaker Finite State Machine

## Status
Accepted

## Context
External upstream LLM providers occasionally experience:
- HTTP 429 Rate Limits
- HTTP 500/502/503 Service Outages
- Unacceptable P95 latency degradation (e.g. queue spikes > 4,000ms)

Without a circuit breaker pattern, client applications hang, exhaust connection pools, and fail entirely, causing cascading outages across enterprise services.

## Decision
We implement an active In-Memory Circuit Breaker Finite State Machine (FSM) per provider with three distinct states:

```
        ┌──────────────────────────────────────────────┐
        │                                              │
        ▼                                              │ (Canary Failure)
   [ CLOSED ] ───(Failure Rate > 50% OR P95 > 3s)──► [ OPEN ]
        ▲                                              │
        │                                              │ (Cooldown Elapsed 15s)
        │                                              ▼
        └────────────(3 Consecutive Successes)─── [ HALF_OPEN ]
```

### State Definitions & Rules:
1. **`CLOSED` (Healthy):**
   - Normal operation. Requests flow directly to the provider.
   - Sliding rolling window of recent calls (size $N = 20$).
   - If failure rate exceeds $50\%$ OR rolling P95 latency exceeds $3,000\text{ms}$, the circuit transitions immediately to `OPEN`.
2. **`OPEN` (Short-Circuited / Tripped):**
   - All inbound traffic destined for this provider is immediately intercepted and short-circuited in $< 1\text{ms}$.
   - Requests are rerouted to healthy backup providers in the same or lower tier.
   - Cooldown timer starts ($15,000\text{ms}$).
3. **`HALF_OPEN` (Canary Recovery Probe):**
   - Once cooldown expires, a limited canary fraction ($10\%$ of requests) is permitted through.
   - If $3$ consecutive canary requests succeed, the breaker resets to `CLOSED`.
   - If any canary request fails, the breaker trips immediately back to `OPEN` for another cooldown cycle.

## Chaos Engineering Injection
To test resilience during CI and live demonstrations, the FSM accepts manual chaos injections:
- Forced Latency Spike (e.g. $+3,500\text{ms}$)
- Forced HTTP 429 / 503 errors
- Immediate breaker trip override

## Consequences
- **Positive:** Zero client downtime during single-provider outages. Automatic transparent failovers in $< 5\text{ms}$.
- **Negative:** Slightly higher latency on failover requests due to sequential fallback retry.
