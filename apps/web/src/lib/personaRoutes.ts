import { isPathWithin } from './surface';
import type { Persona } from './persona';

// 「這一頁屬於哪一種身分。」切換身分之後，**留在原地是錯的**。
//
// Human Owner 2026-08-20 回報：園長在人員管理頁上切換成家長身分，那一頁還留在畫面上。
// 這不是權限問題（他確實是園長，後端也會放行），是**殼切了但頁面沒切** ——
// 「一次只用一種身分」的意思是切下去之後整個世界都要換掉，包括你現在站的位置。
//
// 大部分的頁面**兩種身分都成立**，只是內容不同（`/liff/leave` 家長是申請、校方是審核），
// 那些頁面切換身分後應該留在原地 —— 那正是「同一個網址，依身分渲染不同的頁」的設計。
// 所以這裡列的是**例外**：只屬於某一種身分的那幾條。

const STAFF_ONLY = ['/liff/admin', '/liff/audit'];
const TEACHER_ONLY = ['/liff/class'];
// 學生整合視圖是校方查一個孩子的地方。家長看自己小孩走的是聯絡簿那條路
//（/liff/communication-book/[studentId]），不是這裡。
const SCHOOL_SIDE = ['/liff/student'];

/** 切換身分後如果站不住，要退到哪裡。每一種身分的首頁都是同一個網址，內容才依身分不同。 */
export const PERSONA_HOME = '/liff';

function within(pathname: string, bases: readonly string[]): boolean {
  return bases.some((base) => isPathWithin(pathname, base));
}

/** 這個身分站得住這一頁嗎。站不住就該退回 PERSONA_HOME。 */
export function isRouteForPersona(pathname: string, persona: Persona): boolean {
  if (within(pathname, STAFF_ONLY)) {
    return persona === 'staff';
  }
  if (within(pathname, TEACHER_ONLY)) {
    return persona === 'teacher';
  }
  if (within(pathname, SCHOOL_SIDE)) {
    return persona === 'staff' || persona === 'teacher';
  }
  return true;
}
