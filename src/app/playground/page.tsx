'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { ComplexityMeter } from '@/components/playground/ComplexityMeter';
import { ReplayComparator } from '@/components/playground/ReplayComparator';
import { PromptComplexityClassifier, ComplexityAnalysis } from '@/core/classifier/complexity';
import { RequestTrace, RoutingMode, ProviderType } from '@/core/types';
import {
  PlaySquare,
  Sparkles,
  Send,
  Zap,
  RotateCcw,
  CheckCircle2,
  Clock,
  Layers,
  Coins,
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

const PROMPT_PRESETS = [
  {
    name: 'Reverse Linked List (Tier 2 Code)',
    prompt: 'How to reverse a singly linked list in TypeScript with O(1) auxiliary space? Provide full type definitions and loop invariants.',
  },
  {
    name: 'Distributed Consensus (Tier 3 Deep)',
    prompt: 'Prove the loop invariant for distributed consensus under network partitions and Byzantine faults. Think step by step and derive time complexity.',
  },
  {
    name: 'Translate to French (Tier 1 Edge)',
    prompt: 'Translate this to French: "Real-time observability and circuit breaker mesh architecture."',
  },
  {
    name: 'Greetings & Chit-Chat (Tier 1 Edge)',
    prompt: 'Hello! Can you briefly introduce what the AegisGateway semantic mesh does?',
  },
];

function PlaygroundContent() {
  const searchParams = useSearchParams();
  const replayId = searchParams.get('replayId');

  const [prompt, setPrompt] = useState(
    'How to reverse a singly linked list in TypeScript with O(1) auxiliary space? Provide full type definitions and loop invariants.'
  );
  const [routingMode, setRoutingMode] = useState<RoutingMode>('auto-moe');
  const [preferredProvider, setPreferredProvider] = useState<ProviderType>('gemini');
  const [stream, setStream] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);

  // Results
  const [streamOutput, setStreamOutput] = useState('');
  const [activeTrace, setActiveTrace] = useState<RequestTrace | null>(null);
  const [originalTrace, setOriginalTrace] = useState<RequestTrace | null>(null);

  // Real-time complexity analysis
  const [analysis, setAnalysis] = useState<ComplexityAnalysis>(
    PromptComplexityClassifier.analyze(prompt)
  );

  useEffect(() => {
    setAnalysis(PromptComplexityClassifier.analyze(prompt));
  }, [prompt]);

  // Load original trace if in fork & replay mode
  useEffect(() => {
    if (!replayId) return;

    fetch(`/api/v1/traces/${replayId}`)
      .then((res) => res.json())
      .then((data: RequestTrace) => {
        if (data && data.id) {
          setOriginalTrace(data);
          setPrompt(data.promptFull);
          setRoutingMode((data.routingTier as any) || 'auto-moe');
        }
      })
      .catch(() => {});
  }, [replayId]);

  const handleExecute = async () => {
    if (!prompt.trim() || isExecuting) return;

    setIsExecuting(true);
    setStreamOutput('');
    setActiveTrace(null);

    // If we have an original trace to replay, use the replay endpoint
    if (originalTrace) {
      try {
        const res = await fetch(`/api/v1/traces/${originalTrace.id}/replay`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modifiedPrompt: prompt,
            routingMode,
            provider: preferredProvider,
          }),
        });
        const data = await res.json();
        if (data.replayedTrace) {
          setActiveTrace(data.replayedTrace);
          setStreamOutput(data.replayedTrace.responsePreview);
        }
      } catch (err) {
        setStreamOutput('Replay failed: ' + String(err));
      } finally {
        setIsExecuting(false);
      }
      return;
    }

    // Standard completion execution (supports streaming)
    try {
      if (stream) {
        const res = await fetch('/api/v1/gateway/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            routingMode,
            stream: true,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          setStreamOutput('Error: ' + (errData.error || res.statusText));
          setIsExecuting(false);
          return;
        }

        const traceId = res.headers.get('X-Aegis-Trace-Id');
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let accumulated = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const textChunk = decoder.decode(value);
            const lines = textChunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const parsed = JSON.parse(line.replace('data: ', ''));
                  if (parsed.text) {
                    accumulated += parsed.text;
                    setStreamOutput(accumulated);
                  }
                } catch {
                  // ignore
                }
              }
            }
          }
        }

        if (traceId) {
          const traceRes = await fetch(`/api/v1/traces/${traceId}`);
          if (traceRes.ok) {
            const traceData = await traceRes.json();
            setActiveTrace(traceData);
          }
        }
      } else {
        const res = await fetch('/api/v1/gateway/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            routingMode,
            stream: false,
          }),
        });

        const data = await res.json();
        if (data.text) {
          setStreamOutput(data.text);
          if (data.traceId) {
            const traceRes = await fetch(`/api/v1/traces/${data.traceId}`);
            if (traceRes.ok) {
              const traceData = await traceRes.json();
              setActiveTrace(traceData);
            }
          }
        }
      }
    } catch (err) {
      setStreamOutput('Execution error: ' + String(err));
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <AppShell title="Time-Travel Studio & MoE Playground">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-obsidian-text-muted mr-1">Presets:</span>
          {PROMPT_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(p.prompt);
                setOriginalTrace(null);
              }}
              className="px-3 py-1 rounded-lg bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border text-xs text-obsidian-text-secondary hover:text-white transition-all font-mono"
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Fork & Replay Alert Banner */}
        {originalTrace && (
          <div className="p-4 rounded-xl bg-accent-indigo/10 border border-accent-indigo/30 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="font-bold text-accent-indigo">Time-Travel Fork Mode Active:</span>{' '}
              <span className="text-white">Forking historical trace {originalTrace.id}</span>
            </div>
            <button
              onClick={() => setOriginalTrace(null)}
              className="text-xs text-obsidian-text-muted hover:text-white underline"
            >
              Exit Replay Mode
            </button>
          </div>
        )}

        {/* Split Pane: Left Composer vs Right Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANE: Composer & Real-Time Classifier */}
          <div className="space-y-4">
            <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Input Prompt
                </label>
                <span className="text-[11px] font-mono text-obsidian-text-muted">
                  {prompt.length} chars (~{analysis.estimatedTokens} tokens)
                </span>
              </div>

              <textarea
                rows={7}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter prompt to classify and route..."
                className="w-full bg-obsidian-card border border-obsidian-border rounded-lg p-3 text-xs text-white placeholder:text-obsidian-text-muted focus:outline-none focus:border-obsidian-border-active font-mono resize-none leading-relaxed"
              />

              {/* Policy & Provider Settings */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-obsidian-text-muted block mb-1">Routing Mode</label>
                  <select
                    value={routingMode}
                    onChange={(e) => setRoutingMode(e.target.value as RoutingMode)}
                    className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                  >
                    <option value="auto-moe">Auto-MoE</option>
                    <option value="cost-optimized">Cost-Optimized</option>
                    <option value="latency-critical">Latency-Critical</option>
                    <option value="quality-max">Quality-Max</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-obsidian-text-muted block mb-1">Target Mesh</label>
                  <select
                    value={preferredProvider}
                    onChange={(e) => setPreferredProvider(e.target.value as ProviderType)}
                    className="w-full bg-obsidian-card border border-obsidian-border rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-obsidian-border-active text-xs"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="openai">OpenAI Fabric</option>
                    <option value="simulator">Deterministic Simulator</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <button
                    onClick={() => setStream(!stream)}
                    className={cn(
                      'w-full py-1.5 rounded-lg border text-xs transition-all flex items-center justify-center gap-1.5',
                      stream
                        ? 'bg-accent-indigo/15 text-accent-indigo border-accent-indigo/30'
                        : 'bg-obsidian-card text-obsidian-text-secondary border-obsidian-border'
                    )}
                  >
                    <Zap className="w-3 h-3" />
                    <span>{stream ? 'SSE Stream: ON' : 'JSON: OFF'}</span>
                  </button>
                </div>
              </div>

              {/* Execute Button */}
              <button
                onClick={handleExecute}
                disabled={isExecuting || !prompt.trim()}
                className={cn(
                  'w-full py-3 rounded-xl font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-glow-indigo',
                  isExecuting
                    ? 'bg-obsidian-hover text-obsidian-text-muted cursor-not-allowed'
                    : 'bg-accent-indigo hover:bg-accent-indigo-dark text-white'
                )}
              >
                {isExecuting ? (
                  <>
                    <RotateCcw className="w-4 h-4 animate-spin" />
                    <span>Streaming Completion...</span>
                  </>
                ) : originalTrace ? (
                  <>
                    <PlaySquare className="w-4 h-4" />
                    <span>Run Fork & Replay Diff</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Execute Gateway Completion</span>
                  </>
                )}
              </button>
            </div>

            {/* Dynamic Complexity Meter */}
            <ComplexityMeter analysis={analysis} />
          </div>

          {/* RIGHT PANE: Streaming Output & Side-by-Side Diff */}
          <div className="space-y-4">
            {/* If Replay Diff available, show Comparator */}
            {originalTrace && activeTrace && (
              <ReplayComparator original={originalTrace} replayed={activeTrace} />
            )}

            {/* Live Completion Output Box */}
            <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4 flex flex-col min-h-[480px]">
              <div className="flex items-center justify-between border-b border-obsidian-border pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Completion Stream
                </span>

                {activeTrace && (
                  <div className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-obsidian-card border border-obsidian-border text-white">
                      {activeTrace.modelRouted}
                    </span>
                    <span className="text-accent-emerald flex items-center gap-1 font-semibold">
                      <Clock className="w-3 h-3" />
                      {activeTrace.latencyMs} ms
                    </span>
                    {activeTrace.cacheHit && (
                      <span className="px-1.5 py-0.5 rounded bg-accent-emerald/20 text-accent-emerald font-bold">
                        CACHE HIT
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Output Content */}
              <div className="flex-1 bg-obsidian-card border border-obsidian-border rounded-lg p-4 font-mono text-xs text-white whitespace-pre-wrap overflow-y-auto leading-relaxed">
                {streamOutput || (
                  <span className="text-obsidian-text-muted">
                    Ready to stream. Click Execute or choose a prompt preset above to test real-time semantic routing and deterministic token streaming.
                  </span>
                )}
              </div>

              {/* Trace Metrics Footer */}
              {activeTrace && (
                <div className="pt-3 border-t border-obsidian-border grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                  <div>
                    <div className="text-[10px] text-obsidian-text-muted">Total Tokens</div>
                    <div className="font-bold text-white">{activeTrace.totalTokens}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-obsidian-text-muted">Actual Cost</div>
                    <div className="font-bold text-accent-indigo">{formatCurrency(activeTrace.actualCost)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-obsidian-text-muted">FinOps Saved</div>
                    <div className="font-bold text-accent-emerald">{formatCurrency(activeTrace.dollarsSaved)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-obsidian-text-muted">Trace ID</div>
                    <div className="font-bold text-obsidian-text-secondary truncate">
                      {activeTrace.id.substring(0, 10)}...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-obsidian-bg text-obsidian-text-muted font-mono text-xs">
          Loading Time-Travel Studio...
        </div>
      }
    >
      <PlaygroundContent />
    </Suspense>
  );
}
