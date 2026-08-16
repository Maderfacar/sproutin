import type { NextResponse } from 'next/server';
import { proxyToApi } from '../../../../lib/server/proxy';

// same-origin proxy → 後端 PATCH /attendance/:id（修改出缺勤;老師點名 override）。
export const dynamic = 'force-dynamic';

export function PATCH(req: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  return proxyToApi(req, `/attendance/${encodeURIComponent(params.id)}`);
}
