import { TelemetryBroadcaster } from '@/services/telemetry.service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const broadcaster = TelemetryBroadcaster.getInstance();

  const stream = new ReadableStream({
    start(controller) {
      const unregister = broadcaster.registerClient(controller);

      // Keepalive heartbeat every 15 seconds
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': ping\n\n'));
        } catch {
          clearInterval(heartbeatInterval);
          unregister();
        }
      }, 15000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
