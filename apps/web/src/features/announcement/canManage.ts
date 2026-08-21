import type { RoleFlags } from '../../lib/roles';
import type { AnnouncementView } from '../../lib/types';

// 誰能動一則**已經發出去**的公告：園長、行政、以及發布的人自己
//（Human Owner 2026-08-20 定案）。後端是最終判斷，這裡只決定畫不畫入口。
//
// 抽成純函式而不是寫在元件裡，是因為這條規則有三個容易搞混的地方，每一個都值得一條測試：
//
//   ① **不等於發布權限。** 導師調班之後仍然改得動自己以前發過的那幾則（那是他寫的東西）；
//      反過來，能發班級公告不代表能刪同事發的那一則。
//   ② **要吃 persona 收斂過的旗標**（useCapabilities，不是 roleFlags）。園長切到老師身分時
//      canAnnounceSchool 會變成 false，於是他只動得了自己發的 —— 與這個殼其他地方一致。
//   ③ **家長身分下一律不給。** canAnnounce 為 false 時整組入口消失，
//      即使那則公告剛好是他以老師身分發的。
export function canManageAnnouncement(
  flags: RoleFlags,
  userId: string,
  announcement: AnnouncementView,
): boolean {
  if (!flags.canAnnounce) {
    return false;
  }
  return flags.canAnnounceSchool || announcement.createdBy === userId;
}
