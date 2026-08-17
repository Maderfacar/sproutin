import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { put } from '@vercel/blob';
import type { AuthUser } from '@sproutin/shared';
import { SESSION_COOKIE } from '../../../../lib/server/session-cookie';

// 圖片上傳（園所 logo / 封面）→ Vercel Blob（Human Owner 定案 2026-08-17）。
// 只存「圖片網址」到 SchoolConfig，換儲存服務不需改頁面。
//
// 授權：same-origin 層先確認「這個人是不是校方管理者」——帶 cookie 的 JWT 向後端 /me 取角色，
// 只有 OWNER/ADMIN 可上傳（與 PATCH /school/config 同一條線）。真正的資料授權仍在後端 Guard。
// 尚未接上 Blob Store → 503 upload_unconfigured，前端改用內建圖庫/貼網址，不會壞掉。
// 憑證有兩種：Vercel 專案連上 Blob Store 後預設走 OIDC（BLOB_STORE_ID + 自動輪替的 VERCEL_OIDC_TOKEN），
// 專案外或 client upload 才用長期 token BLOB_READ_WRITE_TOKEN。SDK 會自行解析，這裡只判斷「有沒有接上」。
export const dynamic = 'force-dynamic';

function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);
}

const MAX_BYTES = 4 * 1024 * 1024; // 4MB（logo/封面綽綽有餘，避免大檔拖慢載入）
// 不接受 SVG：SVG 可內嵌腳本，園所上傳的圖片不做消毒 → 只收點陣圖。
const ALLOWED: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};
const KINDS = new Set(['logo', 'banner', 'richmenu']);

// LINE 圖文選單底圖另有更嚴格的限制（查證自 LINE Messaging API reference）：
// 只收 JPEG/PNG（不收 WebP）、檔案 ≤1MB、寬 800–2500、寬/高 ≥1.45。
// 這裡先擋格式與大小 —— 尺寸要讀圖才知道，交給前端預檢與套用時的後端驗證。
const RICH_MENU_MAX_BYTES = 1024 * 1024;
const RICH_MENU_TYPES = new Set(['image/png', 'image/jpeg']);

function fail(status: number, code: string): NextResponse {
  return NextResponse.json({ success: false, error: { code, message: code } }, { status });
}

async function isSchoolManager(): Promise<boolean> {
  const apiInternalUrl = process.env.API_INTERNAL_URL;
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!apiInternalUrl || !token) {
    return false;
  }
  const res = await fetch(`${apiInternalUrl}/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    return false;
  }
  const me = (await res.json()) as AuthUser;
  return me.roles.some((r) => r.role === 'OWNER' || r.role === 'ADMIN');
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!isBlobConfigured()) {
    return fail(503, 'upload_unconfigured');
  }
  if (!(await isSchoolManager())) {
    return fail(403, 'out_of_scope');
  }

  const form = await req.formData();
  const kind = String(form.get('kind') ?? '');
  const file = form.get('file');

  if (!KINDS.has(kind)) {
    return fail(400, 'invalid_input');
  }
  if (!(file instanceof File)) {
    return fail(400, 'invalid_input');
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return fail(400, 'unsupported_image_type');
  }
  if (file.size > MAX_BYTES) {
    return fail(400, 'image_too_large');
  }
  if (kind === 'richmenu') {
    if (!RICH_MENU_TYPES.has(file.type)) {
      return fail(400, 'rich_menu_image_format');
    }
    if (file.size > RICH_MENU_MAX_BYTES) {
      return fail(400, 'rich_menu_image_too_large');
    }
  }

  // 每校一個資料夾（logo/封面本就是公開資產;幼兒照片等敏感媒體未來需另設計獨立空間 + 簽名網址）。
  const schoolSlug = process.env.SCHOOL_SLUG ?? 'dev';
  const blob = await put(`schools/${schoolSlug}/${kind}.${ext}`, file, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.type,
  });

  return NextResponse.json({ url: blob.url });
}
