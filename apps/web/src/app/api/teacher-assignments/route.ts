import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /teacher-assignments（POST 老師編制班級）。
export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/teacher-assignments');
}
