import { NextResponse } from 'next/server';
import { MetricsService } from '@/services/metrics.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const metrics = MetricsService.getInstance().generatePrometheusMetrics();

  return new NextResponse(metrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}
