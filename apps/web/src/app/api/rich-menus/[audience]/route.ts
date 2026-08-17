import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 PUT /rich-menus/:audience（儲存設計，不碰 LINE）。
export const dynamic = 'force-dynamic';

export function PUT(
  req: Request,
  { params }: { params: { audience: string } },
): Promise<NextResponse> {
  return proxyToApi(req, `/rich-menus/${encodeURIComponent(params.audience)}`);
}
