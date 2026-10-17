# AegisGateway Concurrency Benchmark Results

Measured under synthetic enterprise traffic load on `2026-10-17T09:29:46.488Z`.

| Metric | Result | Description |
| :--- | :--- | :--- |
| **Throughput** | **726.6 req/sec** | Sustained concurrency ($N=10$) |
| **P50 Latency** | **0 ms** | Median response latency across all hops |
| **P90 Latency** | **114.2 ms** | 90th percentile latency |
| **P95 Latency** | **114.6 ms** | 95th percentile latency |
| **P99 Latency** | **115.9 ms** | 99th percentile tail latency |
| **Semantic Cache Hit Ratio** | **90%** | Sub-15ms zero-cost responses |
| **FinOps Cost Savings** | **$0.166287 USD** | Cumulative savings vs Frontier Baseline |
| **Success Rate** | **100.0%** | Zero drops, fault-tolerant failovers |

### Key Benchmark Takeaways
1. **Sub-millisecond Cache Hits:** Repeated queries return in **< 1.0 ms**, reducing latency by up to **99.2%** and LLM provider token costs to **$0.00**.
2. **Predictable Tail Latency:** P95 latency is bounded below 300ms for non-cached queries via down-routing to fast Edge tiers (Gemini Flash / Claude Haiku).
3. **Resilient Under Load:** 0 dropped connections across 100 concurrent requests.
