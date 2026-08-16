import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

// same-origin proxy → 後端 /students/:id/detail（學生整合視圖：基本資料 + 班名 + 監護人）。
export const dynamic = 'force-dynamic';

export function GET(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/students/${encodeURIComponent(params.id)}/detail`);
}
