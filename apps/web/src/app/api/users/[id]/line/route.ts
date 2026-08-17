import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../lib/server/proxy';

// same-origin proxy → 後端 /users/:id/line（解除 LINE 綁定；帳號本身不刪除）。
export const dynamic = 'force-dynamic';

export function DELETE(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/users/${encodeURIComponent(params.id)}/line`);
}
