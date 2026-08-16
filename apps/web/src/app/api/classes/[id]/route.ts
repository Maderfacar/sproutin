import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /classes/:id（PATCH 改班名;DELETE 刪除空班，皆 OWNER/ADMIN）。
export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/classes/${encodeURIComponent(params.id)}`);
}

export function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/classes/${encodeURIComponent(params.id)}`);
}
