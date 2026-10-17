'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  CheckCircle,
  Code2,
  Terminal,
  Cpu,
  Layers,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useWorkspaceRole } from '@/context/WorkspaceRoleContext';

interface IntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IntegrationModal({ isOpen, onClose }: IntegrationModalProps) {
  const [activeTab, setActiveTab] = useState<'ts' | 'python' | 'curl'>('ts');
  const [copied, setCopied] = useState(false);
  const { activeWorkspace, activeRole } = useWorkspaceRole();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tsCode = `import OpenAI from 'openai';

// AegisGateway drop-in replacement for OpenAI SDK
const client = new OpenAI({
  apiKey: 'ag_live_demo_enterprise_master_key_9f8a3b1c',
  baseURL: 'http://localhost:3000/api/v1',
  defaultHeaders: {
    'x-aegis-workspace': '${activeWorkspace.id}',
    'x-aegis-role': '${activeRole}',
    'x-aegis-routing-mode': 'auto-moe'
  }
});

async function main() {
  const response = await client.chat.completions.create({
    model: 'auto-moe', // Automatically routed across Gemini, Claude, and OpenAI
    messages: [{ role: 'user', content: 'Explain distributed consensus loop in TypeScript' }],
    stream: false,
  });

  console.log(response.choices[0].message.content);
}

main();`;

  const pythonCode = `from openai import OpenAI

# AegisGateway drop-in replacement for OpenAI Python SDK
client = OpenAI(
    api_key="ag_live_demo_enterprise_master_key_9f8a3b1c",
    base_url="http://localhost:3000/api/v1",
    default_headers={
        "x-aegis-workspace": "${activeWorkspace.id}",
        "x-aegis-role": "${activeRole}",
        "x-aegis-routing-mode": "auto-moe"
    }
)

completion = client.chat.completions.create(
    model="auto-moe",
    messages=[{"role": "user", "content": "Explain distributed consensus loop in TypeScript"}]
)

print(completion.choices[0].message.content)`;

  const curlCode = `curl -X POST http://localhost:3000/api/v1/gateway/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ag_live_demo_enterprise_master_key_9f8a3b1c" \\
  -H "x-aegis-workspace: ${activeWorkspace.id}" \\
  -H "x-aegis-role: ${activeRole}" \\
  -d '{
    "prompt": "Explain distributed consensus loop in TypeScript",
    "stream": true,
    "routingMode": "auto-moe",
    "tenantId": "${activeWorkspace.id}"
  }'`;

  const currentSnippet = activeTab === 'ts' ? tsCode : activeTab === 'python' ? pythonCode : curlCode;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl rounded-2xl bg-obsidian-card border border-obsidian-border shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-obsidian-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-indigo/15 text-accent-indigo border border-accent-indigo/30">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Integrate AegisGateway SDK
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30">
                  OpenAI Drop-In
                </span>
              </h2>
              <p className="text-xs text-obsidian-text-secondary mt-0.5">
                Zero code changes required. Point your existing SDK <code className="text-white">baseURL</code> to AegisGateway.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-obsidian-text-muted hover:text-white hover:bg-obsidian-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tenant Config Info Banner */}
        <div className="px-6 py-2.5 bg-obsidian-surface border-b border-obsidian-border flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2 text-obsidian-text-muted">
            <Layers className="w-3.5 h-3.5 text-accent-indigo" />
            <span>Target Workspace:</span>
            <span className="text-white font-semibold">{activeWorkspace.name}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-accent-indigo">
              {activeWorkspace.id}
            </span>
          </div>

          <div className="flex items-center gap-2 text-obsidian-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-accent-emerald" />
            <span>Active Role:</span>
            <span className="text-white font-semibold capitalize">{activeRole}</span>
          </div>
        </div>

        {/* Code Tabs */}
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-obsidian-surface border border-obsidian-border text-xs font-mono">
              <button
                onClick={() => setActiveTab('ts')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'ts'
                    ? 'bg-accent-indigo text-white font-semibold shadow-glow-indigo'
                    : 'text-obsidian-text-secondary hover:text-white'
                }`}
              >
                TypeScript / Node
              </button>
              <button
                onClick={() => setActiveTab('python')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'python'
                    ? 'bg-accent-indigo text-white font-semibold shadow-glow-indigo'
                    : 'text-obsidian-text-secondary hover:text-white'
                }`}
              >
                Python SDK
              </button>
              <button
                onClick={() => setActiveTab('curl')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === 'curl'
                    ? 'bg-accent-indigo text-white font-semibold shadow-glow-indigo'
                    : 'text-obsidian-text-secondary hover:text-white'
                }`}
              >
                cURL / HTTP
              </button>
            </div>

            <button
              onClick={() => copyToClipboard(currentSnippet)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-obsidian-surface hover:bg-obsidian-hover border border-obsidian-border text-xs font-mono text-obsidian-text-secondary hover:text-white transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-accent-emerald" />
                  <span className="text-accent-emerald font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-obsidian-bg border border-obsidian-border text-xs font-mono text-gray-200 overflow-x-auto max-h-80 leading-relaxed">
            <code>{currentSnippet}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="p-4 bg-obsidian-surface border-t border-obsidian-border flex items-center justify-between text-xs">
          <span className="text-obsidian-text-muted">
            Need custom endpoints or SDK streaming? Inspect the full{' '}
            <a href="/docs" className="text-accent-indigo hover:underline inline-flex items-center gap-1">
              API Reference <ExternalLink className="w-3 h-3" />
            </a>
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-obsidian-card hover:bg-obsidian-hover border border-obsidian-border text-xs font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
