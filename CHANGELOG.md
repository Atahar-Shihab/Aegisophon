# Changelog

All notable changes to **AegisGateway** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-17

### Added
- **Core Architecture**:
  - MoE Semantic Routing & Complexity Classifier (0.00 - 1.00 scoring).
  - Fault-Tolerant Circuit Breaker FSM (`CLOSED`, `OPEN`, `HALF_OPEN`) with automatic fallback failover.
  - Sliding-Window Dual Rate Limiter (RPM & TPM).
  - Semantic Vector Cache with cosine similarity hashing (<15ms cache hits).
  - FinOps Cost Governance Ledger with multi-tier pricing models and savings metrics.
  - Deterministic streaming simulator with chaos injection (latency spikes, 429 rate limits, 503 outages).
- **Gateway Endpoints**:
  - `POST /api/v1/gateway/completions` supporting SSE streaming and JSON completions.
  - `GET /api/v1/telemetry/stream` (SSE live dashboard feed).
  - `GET /api/v1/traces` & `/api/v1/traces/[id]` & `/api/v1/traces/[id]/replay`.
  - `POST /api/v1/chaos` real-time fault injection.
  - `GET /api/v1/circuit` real-time provider mesh status.
  - `POST /api/v1/traffic-simulator` live synthetic traffic generator.
  - `GET /api/v1/keys` SHA-256 cryptographic API key issuance & scoping.
- **UI / UX ("Obsidian Observatory")**:
  - Command Center Dashboard (`/dashboard`) with real-time KPI ribbon, provider mesh cards, and Recharts latency/FinOps telemetry.
  - Live Trace Explorer & Gantt Waterfall Drawer (`/traces`) with microsecond hop breakdowns.
  - Time-Travel Replay & MoE Router Playground (`/playground`) with side-by-side A/B comparisons.
  - FinOps & Routing Policy Configurator (`/policies`).
  - Scoped API Keys & Immutable Audit Trail (`/security`).
  - Global Command Palette (`Cmd+K` / `Ctrl+K`).
