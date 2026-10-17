import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const openApiSpec = {
    openapi: '3.1.0',
    info: {
      title: 'AegisGateway AI Semantic Router & Circuit-Breaker Mesh API',
      version: '1.0.0',
      description:
        'Enterprise Multi-Tenant AI Semantic Router, Fault-Tolerant Circuit-Breaker Mesh, and Real-Time Observability Gateway.',
      contact: {
        name: 'AegisGateway Systems Engineering',
        url: 'https://github.com/Atahar-Shihab/Aegisophon',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current Environment Gateway',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'ag_live_hex',
          description: 'Authenticate using an AegisGateway API Key (e.g. Bearer ag_live_...)',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Alternative header authentication via x-api-key',
        },
      },
      schemas: {
        GatewayCompletionRequest: {
          type: 'object',
          required: ['prompt'],
          properties: {
            prompt: {
              type: 'string',
              description: 'The user or system prompt to process through the semantic mesh',
              example: 'How to implement a distributed consensus loop in TypeScript?',
            },
            stream: {
              type: 'boolean',
              description: 'Whether to stream tokens via Server-Sent Events',
              default: false,
            },
            routingMode: {
              type: 'string',
              enum: ['auto-moe', 'cost-optimized', 'latency-critical', 'quality-max'],
              default: 'auto-moe',
              description: 'Routing strategy applied to select model tier',
            },
            temperature: {
              type: 'number',
              minimum: 0,
              maximum: 2,
              default: 0.7,
            },
            maxTokens: {
              type: 'integer',
              default: 1024,
            },
            tenantId: {
              type: 'string',
              default: 'tenant_enterprise_default',
            },
          },
        },
        GatewayCompletionResponse: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'gen_6f8b1c4e' },
            model: { type: 'string', example: 'gemini-1.5-pro' },
            provider: { type: 'string', enum: ['gemini', 'openai', 'anthropic', 'simulator'] },
            tier: { type: 'string', enum: ['tier-1-fast', 'tier-2-balanced', 'tier-3-deep'] },
            content: { type: 'string' },
            usage: {
              type: 'object',
              properties: {
                promptTokens: { type: 'integer' },
                completionTokens: { type: 'integer' },
                totalTokens: { type: 'integer' },
              },
            },
            finOps: {
              type: 'object',
              properties: {
                actualCost: { type: 'number' },
                baselineCost: { type: 'number' },
                dollarsSaved: { type: 'number' },
                savingsPercent: { type: 'number' },
              },
            },
            cacheHit: { type: 'boolean' },
            latencyMs: { type: 'number' },
            traceId: { type: 'string' },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            version: { type: 'string' },
            uptimeSeconds: { type: 'number' },
            subsystems: { type: 'object' },
            providers: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
    paths: {
      '/api/v1/gateway/completions': {
        post: {
          summary: 'Execute AI Completion via MoE Mesh',
          description:
            'Passes prompt through 7 pipeline stages: Auth, Sliding-Window Rate Limit, Guardrails (PII/Injection), Semantic Cache Lookup, MoE Routing, Circuit-Breaker Protected Dispatch, and FinOps Ledger.',
          security: [{ BearerAuth: [] }, { ApiKeyAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/GatewayCompletionRequest' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Successful completion or Server-Sent Events stream',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/GatewayCompletionResponse' },
                },
                'text/event-stream': {
                  schema: { type: 'string' },
                },
              },
            },
            '401': { description: 'Unauthorized / Invalid API Key' },
            '429': { description: 'Rate Limit Exceeded (RPM / TPM Quota)' },
            '503': { description: 'Circuit Breaker Open / All Upstream Providers Degraded' },
          },
        },
      },
      '/api/v1/health': {
        get: {
          summary: 'Kubernetes Liveness & Readiness Health Probe',
          description: 'Returns operational status of all mesh subsystems and upstream providers.',
          responses: {
            '200': {
              description: 'Gateway is healthy or degraded',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } },
              },
            },
            '503': { description: 'Gateway is unhealthy' },
          },
        },
      },
      '/api/v1/metrics': {
        get: {
          summary: 'Prometheus Metrics Exposition Endpoint',
          description: 'Exposes telemetry metrics for scraping in Prometheus text exposition format (version 0.0.4).',
          responses: {
            '200': {
              description: 'Prometheus metrics stream',
              content: {
                'text/plain; version=0.0.4': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
      '/api/v1/traces': {
        get: {
          summary: 'Query Granular Request Traces',
          description: 'Filter time-travel traces with microsecond hop breakdowns.',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
            { name: 'provider', in: 'query', schema: { type: 'string' } },
            { name: 'tier', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'List of traces',
              content: { 'application/json': { schema: { type: 'array', items: { type: 'object' } } } },
            },
          },
        },
      },
      '/api/v1/chaos': {
        post: {
          summary: 'Inject Upstream Fault / Chaos Engineering',
          description: 'Simulates latency spikes, 429 rate limits, or 503 outages against targeted providers.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['provider', 'type'],
                  properties: {
                    provider: { type: 'string' },
                    type: { type: 'string', enum: ['latency', 'rate_limit', 'outage', 'none'] },
                    latencyMs: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Chaos rule applied successfully' },
          },
        },
      },
      '/api/v1/circuit': {
        get: {
          summary: 'List Circuit Breaker Mesh States',
          responses: {
            '200': { description: 'Provider FSM snapshots' },
          },
        },
        post: {
          summary: 'Reset All Circuit Breakers',
          responses: {
            '200': { description: 'Circuits reset to CLOSED' },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
