'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  Code2,
  Send,
  CheckCircle,
  Copy,
  ExternalLink,
  Shield,
  Zap,
  Activity,
  Layers,
  FileJson,
} from 'lucide-react';

interface EndpointDoc {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  title: string;
  description: string;
  authRequired: boolean;
  requestBody?: Record<string, unknown>;
  defaultCurl: string;
  defaultPython: string;
  defaultTypeScript: string;
}

const ENDPOINTS: EndpointDoc[] = [
  {
    id: 'gateway-completions',
    method: 'POST',
    path: '/api/v1/gateway/completions',
    title: 'MoE Gateway Completions',
    description:
      'Routes prompt through 7 pipeline stages: Auth, Sliding-Window Rate Limiting, Guardrails, Semantic Vector Cache, MoE Classifier, Circuit-Breaker Mesh, and FinOps Ledger.',
    authRequired: true,
    requestBody: {
      prompt: 'Implement a distributed circuit breaker in TypeScript',
      stream: false,
      routingMode: 'auto-moe',
      temperature: 0.7,
      maxTokens: 1024,
    },
    defaultCurl: `curl -X POST http://localhost:3000/api/v1/gateway/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ag_live_default_seed_key_for_testing" \\
  -d '{
    "prompt": "Implement a distributed circuit breaker in TypeScript",
    "stream": false,
    "routingMode": "auto-moe"
  }'`,
    defaultPython: `import requests

url = "http://localhost:3000/api/v1/gateway/completions"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ag_live_default_seed_key_for_testing"
}
payload = {
    "prompt": "Implement a distributed circuit breaker in TypeScript",
    "stream": False,
    "routingMode": "auto-moe"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
    defaultTypeScript: `import fetch from 'node-fetch';

const response = await fetch('http://localhost:3000/api/v1/gateway/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ag_live_default_seed_key_for_testing'
  },
  body: JSON.stringify({
    prompt: 'Implement a distributed circuit breaker in TypeScript',
    stream: false,
    routingMode: 'auto-moe'
  })
});

const data = await response.json();
console.log(data);`,
  },
  {
    id: 'health-check',
    method: 'GET',
    path: '/api/v1/health',
    title: 'Kubernetes Health & Readiness Probe',
    description:
      'Reports overall status ("healthy" | "degraded" | "unhealthy") plus detailed operational health of circuit breaker mesh, semantic cache, and process memory.',
    authRequired: false,
    defaultCurl: `curl -X GET http://localhost:3000/api/v1/health`,
    defaultPython: `import requests
res = requests.get("http://localhost:3000/api/v1/health")
print(res.json())`,
    defaultTypeScript: `const res = await fetch('http://localhost:3000/api/v1/health');
console.log(await res.json());`,
  },
  {
    id: 'prometheus-metrics',
    method: 'GET',
    path: '/api/v1/metrics',
    title: 'Prometheus Metrics Exposition',
    description:
      'Standard Prometheus text exposition format (version 0.0.4) for automated scraping by Prometheus, Datadog, or Grafana Agent.',
    authRequired: false,
    defaultCurl: `curl -X GET http://localhost:3000/api/v1/metrics`,
    defaultPython: `import requests
res = requests.get("http://localhost:3000/api/v1/metrics")
print(res.text)`,
    defaultTypeScript: `const res = await fetch('http://localhost:3000/api/v1/metrics');
console.log(await res.text());`,
  },
  {
    id: 'traces-query',
    method: 'GET',
    path: '/api/v1/traces',
    title: 'Granular Traces Query',
    description:
      'Query historical traces with microsecond timings across each pipeline hop, cache hit flags, and FinOps ledger savings.',
    authRequired: false,
    defaultCurl: `curl -X GET "http://localhost:3000/api/v1/traces?limit=10"`,
    defaultPython: `import requests
res = requests.get("http://localhost:3000/api/v1/traces", params={"limit": 10})
print(res.json())`,
    defaultTypeScript: `const res = await fetch('http://localhost:3000/api/v1/traces?limit=10');
console.log(await res.json());`,
  },
  {
    id: 'chaos-fault-injection',
    method: 'POST',
    path: '/api/v1/chaos',
    title: 'Chaos Engineering Injection',
    description:
      'Inject latency spikes, 429 rate limits, or 503 provider outages to trigger and observe real-time circuit-breaker failover.',
    authRequired: false,
    requestBody: {
      provider: 'gemini',
      type: 'latency',
      latencyMs: 3500,
    },
    defaultCurl: `curl -X POST http://localhost:3000/api/v1/chaos \\
  -H "Content-Type: application/json" \\
  -d '{"provider": "gemini", "type": "latency", "latencyMs": 3500}'`,
    defaultPython: `import requests
requests.post("http://localhost:3000/api/v1/chaos", json={"provider": "gemini", "type": "latency", "latencyMs": 3500})`,
    defaultTypeScript: `await fetch('http://localhost:3000/api/v1/chaos', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ provider: 'gemini', type: 'latency', latencyMs: 3500 })
});`,
  },
  {
    id: 'circuit-reset',
    method: 'POST',
    path: '/api/v1/circuit',
    title: 'Reset All Circuit Breakers',
    description:
      'Manually clears all failure counters and restores every provider circuit breaker back to CLOSED state.',
    authRequired: false,
    defaultCurl: `curl -X POST http://localhost:3000/api/v1/circuit`,
    defaultPython: `import requests
requests.post("http://localhost:3000/api/v1/circuit")`,
    defaultTypeScript: `await fetch('http://localhost:3000/api/v1/circuit', { method: 'POST' });`,
  },
];

export default function DocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDoc>(ENDPOINTS[0]);
  const [activeLang, setActiveLang] = useState<'curl' | 'python' | 'ts'>('curl');
  const [copied, setCopied] = useState(false);
  const [liveResponse, setLiveResponse] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteLive = async () => {
    setIsExecuting(true);
    setLiveResponse(null);
    setLiveStatus(null);
    try {
      let res: Response;
      if (selectedEndpoint.method === 'GET') {
        res = await fetch(selectedEndpoint.path);
      } else {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (selectedEndpoint.authRequired) {
          headers['Authorization'] = 'Bearer ag_live_default_seed_key_for_testing';
        }
        res = await fetch(selectedEndpoint.path, {
          method: selectedEndpoint.method,
          headers,
          body: selectedEndpoint.requestBody ? JSON.stringify(selectedEndpoint.requestBody) : undefined,
        });
      }

      setLiveStatus(res.status);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('json')) {
        const json = await res.json();
        setLiveResponse(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        setLiveResponse(text);
      }
    } catch (err: unknown) {
      setLiveStatus(500);
      setLiveResponse(`Execution error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const getCodeSnippet = () => {
    switch (activeLang) {
      case 'python':
        return selectedEndpoint.defaultPython;
      case 'ts':
        return selectedEndpoint.defaultTypeScript;
      default:
        return selectedEndpoint.defaultCurl;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-obsidian-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                AegisGateway API Reference
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30">
                  OpenAPI 3.1
                </span>
              </h1>
              <p className="text-sm text-obsidian-text-secondary mt-1">
                Interactive documentation, code generators, and live schema explorer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-obsidian-card hover:bg-obsidian-hover border border-obsidian-border text-xs font-mono text-obsidian-text-secondary hover:text-white transition-colors"
          >
            <FileJson className="w-4 h-4 text-accent-indigo" />
            <span>openapi.json</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
          <a
            href="/api/v1/metrics"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-obsidian-card hover:bg-obsidian-hover border border-obsidian-border text-xs font-mono text-obsidian-text-secondary hover:text-white transition-colors"
          >
            <Activity className="w-4 h-4 text-accent-emerald" />
            <span>Prometheus /metrics</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>

      {/* Main Grid: Sidebar List + Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Endpoint List */}
        <div className="lg:col-span-4 space-y-2">
          <h2 className="text-xs font-mono uppercase tracking-wider text-obsidian-text-muted px-2 mb-3">
            Available Endpoints
          </h2>
          {ENDPOINTS.map((ep) => {
            const isSelected = selectedEndpoint.id === ep.id;
            return (
              <button
                key={ep.id}
                onClick={() => {
                  setSelectedEndpoint(ep);
                  setLiveResponse(null);
                  setLiveStatus(null);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-obsidian-hover border-accent-indigo/50 shadow-glow-indigo'
                    : 'bg-obsidian-card border-obsidian-border hover:bg-obsidian-hover/50 text-obsidian-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      ep.method === 'POST'
                        ? 'bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30'
                        : 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                    }`}
                  >
                    {ep.method}
                  </span>
                  {ep.authRequired ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-accent-amber">
                      <Shield className="w-3 h-3" />
                      Key Req
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-obsidian-text-muted">Public</span>
                  )}
                </div>
                <span className="text-xs font-semibold text-white truncate">{ep.title}</span>
                <span className="text-[11px] font-mono text-obsidian-text-muted truncate">{ep.path}</span>
              </button>
            );
          })}
        </div>

        {/* Right Detail Pane */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-2xl bg-obsidian-card border border-obsidian-border space-y-6">
            {/* Endpoint Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`text-xs font-mono px-2.5 py-1 rounded font-bold ${
                    selectedEndpoint.method === 'POST'
                      ? 'bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30'
                      : 'bg-accent-emerald/20 text-accent-emerald border border-accent-emerald/30'
                  }`}
                >
                  {selectedEndpoint.method}
                </span>
                <span className="text-sm font-mono text-white font-semibold">{selectedEndpoint.path}</span>
              </div>
              <h2 className="text-lg font-bold text-white">{selectedEndpoint.title}</h2>
              <p className="text-sm text-obsidian-text-secondary mt-1 leading-relaxed">
                {selectedEndpoint.description}
              </p>
            </div>

            {/* Code Snippet Tabs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-obsidian-border pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveLang('curl')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      activeLang === 'curl'
                        ? 'bg-accent-indigo text-white shadow-glow-indigo'
                        : 'text-obsidian-text-secondary hover:text-white'
                    }`}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setActiveLang('python')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      activeLang === 'python'
                        ? 'bg-accent-indigo text-white shadow-glow-indigo'
                        : 'text-obsidian-text-secondary hover:text-white'
                    }`}
                  >
                    Python
                  </button>
                  <button
                    onClick={() => setActiveLang('ts')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      activeLang === 'ts'
                        ? 'bg-accent-indigo text-white shadow-glow-indigo'
                        : 'text-obsidian-text-secondary hover:text-white'
                    }`}
                  >
                    TypeScript
                  </button>
                </div>

                <button
                  onClick={() => copyToClipboard(getCodeSnippet())}
                  className="flex items-center gap-1.5 text-xs text-obsidian-text-muted hover:text-white font-mono px-2.5 py-1 rounded bg-obsidian-surface border border-obsidian-border transition-colors"
                >
                  {copied ? <CheckCircle className="w-3.5 h-3.5 text-accent-emerald" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-obsidian-bg border border-obsidian-border text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed">
                <code>{getCodeSnippet()}</code>
              </pre>
            </div>

            {/* Interactive "Try It Live" Console */}
            <div className="border-t border-obsidian-border pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent-indigo" />
                    Live Request Sandbox
                  </h3>
                  <p className="text-xs text-obsidian-text-muted mt-0.5">
                    Execute directly against the running AegisGateway instance.
                  </p>
                </div>
                <button
                  onClick={handleExecuteLive}
                  disabled={isExecuting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-indigo hover:bg-accent-indigo-dark text-white text-xs font-semibold shadow-glow-indigo transition-all disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isExecuting ? 'animate-spin' : ''}`} />
                  <span>{isExecuting ? 'Dispatching...' : 'Send Live Request'}</span>
                </button>
              </div>

              {liveStatus !== null && (
                <div className="p-4 rounded-xl bg-obsidian-bg border border-obsidian-border space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-obsidian-text-muted">Status Code:</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded ${
                        liveStatus < 300
                          ? 'bg-accent-emerald/20 text-accent-emerald'
                          : 'bg-accent-rose/20 text-accent-rose'
                      }`}
                    >
                      {liveStatus} {liveStatus === 200 ? 'OK' : ''}
                    </span>
                  </div>
                  <pre className="p-3 rounded-lg bg-black/40 text-[11px] font-mono text-gray-300 overflow-x-auto max-h-72">
                    <code>{liveResponse}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
