'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react';
import { CircuitBreakerState, ProviderType } from '@/core/types';

interface RoutingTopologyGraphProps {
  circuits?: Record<ProviderType, CircuitBreakerState> | CircuitBreakerState[];
  cacheHitRatio?: number;
}

interface NodeDetail {
  id: string;
  name: string;
  stage: string;
  latencyBudget: string;
  description: string;
  status: 'ok' | 'hit' | 'warning' | 'error';
}

export function RoutingTopologyGraph({ circuits, cacheHitRatio = 0.9 }: RoutingTopologyGraphProps) {
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);

  // Normalize circuit state dictionary/array
  const circuitMap: Record<string, CircuitBreakerState> = {};
  if (Array.isArray(circuits)) {
    circuits.forEach((c) => {
      circuitMap[c.providerId] = c;
    });
  } else if (circuits) {
    Object.assign(circuitMap, circuits);
  }

  const isGeminiOpen = circuitMap['gemini']?.state === 'OPEN';
  const isAnthropicOpen = circuitMap['anthropic']?.state === 'OPEN';
  const isOpenAIOpen = circuitMap['openai']?.state === 'OPEN';

  const nodes: NodeDetail[] = [
    {
      id: 'client',
      name: 'Client Ingestion',
      stage: 'POST /v1/gateway/completions',
      latencyBudget: '< 1.0 ms',
      description: 'Incoming REST request or SSE streaming connection authenticated via SHA-256 API key.',
      status: 'ok',
    },
    {
      id: 'guardrail',
      name: 'PII & Injection Guardrail',
      stage: 'Hop 3: Security Scanner',
      latencyBudget: '< 1.5 ms',
      description: 'Heuristic regex & base64 detector blocking prompt injection and redacting SSNs, emails, and API keys.',
      status: 'ok',
    },
    {
      id: 'cache',
      name: 'Semantic Vector Cache',
      stage: 'Hop 4: Cosine Similarity',
      latencyBudget: '< 4.0 ms',
      description: '128-dimensional locality-sensitive hashing. Serves cache hits in <15ms at $0.00 provider cost.',
      status: 'hit',
    },
    {
      id: 'router',
      name: 'MoE Complexity Classifier',
      stage: 'Hop 5: Semantic Router',
      latencyBudget: '< 2.5 ms',
      description: 'Calculates complexity score (0.00 - 1.00) based on reasoning tokens, code density, and syntactic markers.',
      status: 'ok',
    },
    {
      id: 'tier1',
      name: 'Tier 1: Fast / Edge',
      stage: 'Flash / Haiku (<0.35)',
      latencyBudget: '80 - 150 ms',
      description: 'Low-latency edge tier for simple extraction, translation, and summarization.',
      status: isAnthropicOpen ? 'error' : 'ok',
    },
    {
      id: 'tier2',
      name: 'Tier 2: Balanced',
      stage: 'Pro / Sonnet (0.35 - 0.70)',
      latencyBudget: '200 - 450 ms',
      description: 'Analytical tier for standard programming, multi-variable logic, and synthesis.',
      status: isGeminiOpen ? 'error' : 'ok',
    },
    {
      id: 'tier3',
      name: 'Tier 3: Deep Reasoning',
      stage: 'Thinking / o1 (>0.70)',
      latencyBudget: '600 - 1200 ms',
      description: 'Heavy architectural reasoning, mathematical proofs, and distributed systems synthesis.',
      status: isOpenAIOpen ? 'error' : 'ok',
    },
  ];

  return (
    <div className="p-6 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-4 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-accent-indigo/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-emerald/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-obsidian-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-indigo" />
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Interactive Live DAG Routing Topology
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-emerald/15 text-accent-emerald border border-accent-emerald/30 animate-pulse">
              Active Mesh
            </span>
          </div>
          <p className="text-xs text-obsidian-text-muted mt-0.5">
            Real-time pipeline hop execution path. Click any node to inspect latency budget and state machines.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-obsidian-text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-emerald" />
            <span>Optimal Hop</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-indigo" />
            <span>Cache Hit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-rose" />
            <span>Circuit Tripped</span>
          </div>
        </div>
      </div>

      {/* Visual Node Graph Canvas (SVG + HTML overlay) */}
      <div className="relative z-10 py-4 overflow-x-auto">
        <div className="min-w-[860px] flex items-center justify-between relative py-6">
          {/* SVG Animated Connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="cacheGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.9" />
              </linearGradient>
            </defs>

            {/* Ingestion to Guardrail */}
            <line x1="120" y1="50" x2="230" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
            {/* Guardrail to Cache */}
            <line x1="330" y1="50" x2="440" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />
            {/* Cache to Router */}
            <line x1="540" y1="50" x2="650" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeDasharray="4 4" />

            {/* Router to Tiers */}
            <path d="M 750 50 C 780 50, 780 15, 810 15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
            <path d="M 750 50 C 780 50, 780 50, 810 50" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
            <path d="M 750 50 C 780 50, 780 85, 810 85" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
          </svg>

          {/* Node 1: Client Request */}
          <button
            onClick={() => setSelectedNode(nodes[0])}
            className="group relative z-10 w-28 p-3 rounded-xl bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border hover:border-accent-indigo transition-all flex flex-col items-center text-center gap-1 shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-indigo/15 text-accent-indigo flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-white">Client Ingest</span>
            <span className="text-[9px] font-mono text-obsidian-text-muted">Auth & RPM</span>
          </button>

          <ArrowRight className="w-4 h-4 text-obsidian-text-muted opacity-40 shrink-0" />

          {/* Node 2: Guardrail Scanner */}
          <button
            onClick={() => setSelectedNode(nodes[1])}
            className="group relative z-10 w-28 p-3 rounded-xl bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border hover:border-accent-emerald transition-all flex flex-col items-center text-center gap-1 shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-emerald/15 text-accent-emerald flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-white">Guardrails</span>
            <span className="text-[9px] font-mono text-obsidian-text-muted">PII / Injection</span>
          </button>

          <ArrowRight className="w-4 h-4 text-obsidian-text-muted opacity-40 shrink-0" />

          {/* Node 3: Semantic Cache */}
          <button
            onClick={() => setSelectedNode(nodes[2])}
            className="group relative z-10 w-28 p-3 rounded-xl bg-obsidian-surface hover:bg-obsidian-hover border border-accent-indigo/50 transition-all flex flex-col items-center text-center gap-1 shadow-glow-indigo"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-indigo/20 text-accent-indigo flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-white">Semantic Cache</span>
            <span className="text-[9px] font-mono text-accent-emerald">
              {(cacheHitRatio * 100).toFixed(0)}% Hit Ratio
            </span>
          </button>

          <ArrowRight className="w-4 h-4 text-obsidian-text-muted opacity-40 shrink-0" />

          {/* Node 4: MoE Classifier */}
          <button
            onClick={() => setSelectedNode(nodes[3])}
            className="group relative z-10 w-28 p-3 rounded-xl bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border hover:border-accent-indigo transition-all flex flex-col items-center text-center gap-1 shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-accent-indigo/15 text-accent-indigo flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-white">MoE Router</span>
            <span className="text-[9px] font-mono text-obsidian-text-muted">Complexity Score</span>
          </button>

          <ArrowRight className="w-4 h-4 text-obsidian-text-muted opacity-40 shrink-0" />

          {/* Model Tiers Stack */}
          <div className="flex flex-col gap-2 relative z-10">
            {/* Tier 1 */}
            <button
              onClick={() => setSelectedNode(nodes[4])}
              className={`p-2 rounded-lg border text-left flex items-center justify-between gap-3 text-xs transition-all w-48 ${
                isAnthropicOpen
                  ? 'bg-accent-rose/15 border-accent-rose/40 text-accent-rose animate-pulse'
                  : 'bg-obsidian-surface border-obsidian-border text-obsidian-text-secondary hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isAnthropicOpen ? 'bg-accent-rose' : 'bg-accent-emerald'}`} />
                <span className="font-semibold text-white text-[11px]">Tier 1: Fast/Edge</span>
              </div>
              <span className="text-[9px] font-mono">{isAnthropicOpen ? 'OPEN' : '<0.35'}</span>
            </button>

            {/* Tier 2 */}
            <button
              onClick={() => setSelectedNode(nodes[5])}
              className={`p-2 rounded-lg border text-left flex items-center justify-between gap-3 text-xs transition-all w-48 ${
                isGeminiOpen
                  ? 'bg-accent-rose/15 border-accent-rose/40 text-accent-rose animate-pulse'
                  : 'bg-obsidian-surface border-obsidian-border text-obsidian-text-secondary hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isGeminiOpen ? 'bg-accent-rose' : 'bg-accent-emerald'}`} />
                <span className="font-semibold text-white text-[11px]">Tier 2: Balanced</span>
              </div>
              <span className="text-[9px] font-mono">{isGeminiOpen ? 'OPEN' : '0.35-0.70'}</span>
            </button>

            {/* Tier 3 */}
            <button
              onClick={() => setSelectedNode(nodes[6])}
              className={`p-2 rounded-lg border text-left flex items-center justify-between gap-3 text-xs transition-all w-48 ${
                isOpenAIOpen
                  ? 'bg-accent-rose/15 border-accent-rose/40 text-accent-rose animate-pulse'
                  : 'bg-obsidian-surface border-obsidian-border text-obsidian-text-secondary hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isOpenAIOpen ? 'bg-accent-rose' : 'bg-accent-emerald'}`} />
                <span className="font-semibold text-white text-[11px]">Tier 3: Reasoning</span>
              </div>
              <span className="text-[9px] font-mono">{isOpenAIOpen ? 'OPEN' : '>0.70'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Node Drawer / Inspector */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="p-4 rounded-xl bg-obsidian-bg border border-obsidian-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs animate-fade-in"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-accent-indigo" />
                <span className="font-bold text-white">{selectedNode.name}</span>
                <span className="font-mono text-[10px] text-obsidian-text-muted px-1.5 py-0.2 rounded bg-obsidian-surface border border-obsidian-border">
                  {selectedNode.stage}
                </span>
              </div>
              <p className="text-[11px] text-obsidian-text-secondary leading-relaxed">
                {selectedNode.description}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-mono text-obsidian-text-muted">Target SLA</div>
                <div className="text-xs font-mono font-semibold text-accent-emerald">
                  {selectedNode.latencyBudget}
                </div>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="px-2.5 py-1 rounded bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border text-[11px] text-obsidian-text-muted hover:text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
