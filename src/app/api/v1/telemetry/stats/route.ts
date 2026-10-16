import { NextResponse } from 'next/server';
import { TelemetryBroadcaster } from '@/services/telemetry.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const broadcaster = TelemetryBroadcaster.getInstance();
  const snapshot = broadcaster.getSnapshot();
  return NextResponse.json(snapshot);
}
