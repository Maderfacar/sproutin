import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// 接送點（door-to-door：一個接送點通常就是一戶人家）。
export const dynamic = 'force-dynamic';

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/bus/points');
}
