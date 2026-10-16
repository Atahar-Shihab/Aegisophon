import { NextRequest, NextResponse } from 'next/server';
import { GatewayService } from '@/services/gateway.service';
import { GatewayCompletionRequest } from '@/core/types';
import { DeterministicSimulator } from '@/core/providers/simulator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-api-key');
    let apiKey: string | undefined;

    if (authHeader) {
      apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    }

    const body: GatewayCompletionRequest = await req.json();
    body.apiKey = apiKey || body.apiKey;

    if (!body.prompt || body.prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // ──────────────────────────────────────────────
    // Streaming Mode (SSE token-by-token)
    // ──────────────────────────────────────────────
    if (body.stream) {
      const gateway = GatewayService.getInstance();
      const execution = await gateway.execute(body);

      if (execution.statusCode !== 200 || !execution.response) {
        return NextResponse.json(
          { error: execution.error || 'Execution failed' },
          { status: execution.statusCode }
        );
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of DeterministicSimulator.streamTokens({
              prompt: body.prompt,
              model: execution.response?.modelRouted || 'simulator-fast',
            })) {
              const sseEvent = `data: ${JSON.stringify({ text: chunk, traceId: execution.response?.traceId })}\n\n`;
              controller.enqueue(encoder.encode(sseEvent));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Aegis-Trace-Id': execution.response.traceId,
          'X-Aegis-Model-Routed': execution.response.modelRouted,
          'X-Aegis-Cache': execution.response.cacheHit ? 'HIT' : 'MISS',
          'X-Aegis-Tier': execution.response.routingTier,
        },
      });
    }

    // ──────────────────────────────────────────────
    // Standard JSON Response Mode
    // ──────────────────────────────────────────────
    const gateway = GatewayService.getInstance();
    const result = await gateway.execute(body);

    if (result.statusCode !== 200 || !result.response) {
      return NextResponse.json(
        { error: result.error || 'Gateway processing error' },
        { status: result.statusCode }
      );
    }

    return NextResponse.json(result.response, {
      status: 200,
      headers: {
        'X-Aegis-Trace-Id': result.response.traceId,
        'X-Aegis-Model-Routed': result.response.modelRouted,
        'X-Aegis-Cache': result.response.cacheHit ? 'HIT' : 'MISS',
        'X-Aegis-Tier': result.response.routingTier,
        'X-Aegis-Latency-Ms': String(result.response.latencyMs),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
