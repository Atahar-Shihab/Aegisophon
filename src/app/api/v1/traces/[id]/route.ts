import { NextRequest, NextResponse } from 'next/server';
import { TraceService } from '@/services/trace.service';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const trace = TraceService.getInstance().getTraceById(params.id);
  if (!trace) {
    return NextResponse.json({ error: 'Trace not found' }, { status: 404 });
  }
  return NextResponse.json(trace);
}
