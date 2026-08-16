import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 /students/:id（PATCH 改姓名/換班/改在學狀態，OWNER/ADMIN）。
export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/students/${encodeURIComponent(params.id)}`);
}
