import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// 點名畫面的一整包（名單 + 接送點 + 當日紀錄）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/bus/rides');
}
