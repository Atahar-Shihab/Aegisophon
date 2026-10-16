import { NextRequest, NextResponse } from 'next/server';
import { TrafficSimulatorService } from '@/services/traffic-simulator.service';
import { AuditLogService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sim = TrafficSimulatorService.getInstance();
  return NextResponse.json({ running: sim.isRunning() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const sim = TrafficSimulatorService.getInstance();
    const action = body.action || 'toggle';

    let running: boolean;
    if (action === 'start') {
      running = sim.start();
    } else if (action === 'stop') {
      running = sim.stop();
    } else {
      running = sim.toggle();
    }

    AuditLogService.getInstance().record({
      actor: 'demo.recruiter@aegisgateway.internal',
      action: 'SIMULATOR_TOGGLED',
      targetResource: 'traffic_simulator',
      ipAddress: '127.0.0.1',
      diff: {
        after: { running },
      },
    });

    return NextResponse.json({
      running,
      message: running
        ? 'Live traffic simulator started. Streaming requests actively generated.'
        : 'Live traffic simulator stopped.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error toggling traffic simulator';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
