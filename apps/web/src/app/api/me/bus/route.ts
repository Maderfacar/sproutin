import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// 家長看自己小孩的今日乘車狀態（只有讀；家長不能改接送點）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/me/bus');
}
