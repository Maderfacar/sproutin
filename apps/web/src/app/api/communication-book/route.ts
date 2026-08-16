import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /communication-book
// GET ?classId=&date=（校方整班）｜ ?studentId=&date= 或 ?studentId=&from=&to=（單生／回溯）
// PUT 老師填寫當日紀錄（局部更新）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/communication-book');
}

export function PUT(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/communication-book');
}
