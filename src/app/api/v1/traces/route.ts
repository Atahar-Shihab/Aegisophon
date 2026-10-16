import { NextRequest, NextResponse } from 'next/server';
import { TraceService } from '@/services/trace.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit')) || 100;
  const provider = url.searchParams.get('provider') || undefined;
  const tier = url.searchParams.get('tier') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const cacheHitOnly = url.searchParams.get('cacheHit') === 'true';
  const search = url.searchParams.get('search') || undefined;

  const traces = TraceService.getInstance().getTraces({
    limit,
    provider,
    tier,
    status,
    cacheHitOnly,
    search,
  });

  return NextResponse.json({
    traces,
    count: traces.length,
    aggregates: TraceService.getInstance().getAggregates(),
  });
}
