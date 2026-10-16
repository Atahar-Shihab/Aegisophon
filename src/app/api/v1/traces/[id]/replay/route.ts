import { NextRequest, NextResponse } from 'next/server';
import { TraceService } from '@/services/trace.service';
import { GatewayService } from '@/services/gateway.service';
import { RoutingMode } from '@/core/types';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const originalTrace = TraceService.getInstance().getTraceById(params.id);
  if (!originalTrace) {
    return NextResponse.json({ error: 'Original trace not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const prompt = body.modifiedPrompt || originalTrace.promptFull;
  const routingMode = (body.routingMode as RoutingMode) || 'auto-moe';
  const model = body.model || undefined;

  const execution = await GatewayService.getInstance().execute({
    prompt,
    model,
    routingMode,
    temperature: body.temperature ?? 0.7,
  });

  if (execution.statusCode !== 200 || !execution.trace) {
    return NextResponse.json(
      { error: execution.error || 'Replay execution failed' },
      { status: execution.statusCode }
    );
  }

  const replayedTrace = execution.trace;

  const delta = {
    latencyDeltaMs: Number((replayedTrace.latencyMs - originalTrace.latencyMs).toFixed(1)),
    costDeltaUsd: Number((replayedTrace.actualCost - originalTrace.actualCost).toFixed(6)),
    tokenDelta: replayedTrace.totalTokens - originalTrace.totalTokens,
    tierChanged: originalTrace.routingTier !== replayedTrace.routingTier,
    oldTier: originalTrace.routingTier,
    newTier: replayedTrace.routingTier,
    oldModel: originalTrace.modelRouted,
    newModel: replayedTrace.modelRouted,
  };

  return NextResponse.json({
    originalTrace,
    replayedTrace,
    delta,
  });
}
