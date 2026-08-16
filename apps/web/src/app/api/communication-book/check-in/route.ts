import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /communication-book/check-in（點名即到校：同時寫出缺勤與到校時間）。
export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/communication-book/check-in');
}
