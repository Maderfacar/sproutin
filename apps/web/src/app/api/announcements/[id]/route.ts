import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /announcements/:id
//（PATCH 改標題／內文；DELETE 站內刪除。誰能動由後端判斷：園長、行政、發布的人自己）。
export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/announcements/${encodeURIComponent(params.id)}`);
}

export function DELETE(
  req: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  return proxyToApi(req, `/announcements/${encodeURIComponent(params.id)}`);
}
