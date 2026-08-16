import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /guardianships（POST 綁定家長與小孩）。
export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/guardianships');
}
