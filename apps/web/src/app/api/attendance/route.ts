import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../lib/server/proxy';

// same-origin proxy → 後端 /attendance（GET ?studentId= 家長 / ?classId=&date= staff;POST 老師點名）。
export const dynamic = 'force-dynamic';

export function GET(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/attendance');
}

export function POST(req: Request): Promise<NextResponse> {
  return proxyToApi(req, '/attendance');
}
