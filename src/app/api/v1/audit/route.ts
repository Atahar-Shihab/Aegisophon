import { NextRequest, NextResponse } from 'next/server';
import { AuditLogService } from '@/services/audit.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get('limit')) || 100;
  const logs = AuditLogService.getInstance().getLogs(limit);
  return NextResponse.json({ logs });
}
