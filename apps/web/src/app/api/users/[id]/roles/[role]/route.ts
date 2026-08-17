import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../../../lib/server/proxy';

// same-origin proxy → 後端 DELETE /users/:id/roles/:role（移除身分，連同該身分附帶的關聯）。
export const dynamic = 'force-dynamic';

export function DELETE(
  req: Request,
  { params }: { params: { id: string; role: string } },
): Promise<NextResponse> {
  return proxyToApi(
    req,
    `/users/${encodeURIComponent(params.id)}/roles/${encodeURIComponent(params.role)}`,
  );
}
