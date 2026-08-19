'use client';

import { useSession } from '../../lib/session';
import { usePublicConfig } from '../../lib/queries';
import { roleFlags } from '../../lib/roles';
import type { Persona } from '../../lib/persona';
import { SectionHead, Tile } from '../../components/ui';
import type { IconName } from '../../components/Icon';

// 校方首頁的**過渡版**（第二批）。
//
// 第三批（導師）與第四批（行政）才會做成真正的待辦清單 ——「今天還有 3 人沒點名」
// 這種句子要先有對應的後端查詢（整班今日點名進度、待審件數），那是那兩批的工作。
//
// 在那之前先做到兩件事，已經比舊版的卡片牆好找：
//   ① 依身分只列這個人真的會用的入口（導師不會看到權限設定）
//   ② 每一格用磚塊而不是同重的小卡，並且寫清楚點進去會做什麼
//
// 這個檔案在第三、四批會被 TeacherHome / AdminHome 取代並刪除。

interface Entry {
  href: string;
  icon: IconName;
  title: string;
  detail: string;
}

function entriesFor(
  persona: Persona,
  flags: ReturnType<typeof roleFlags>,
  hasBus: boolean,
): { daily: Entry[]; manage: Entry[] } {
  if (persona === 'bus') {
    return {
      daily: [
        { href: '/liff/bus', icon: 'bus', title: '娃娃車點名', detail: '今天這條路線的上下車' },
      ],
      manage: [],
    };
  }

  const daily: Entry[] = [];
  if (flags.canMarkAttendance) {
    daily.push({ href: '/liff/attendance', icon: 'check', title: '點名', detail: '今天這一班的出缺勤' });
  }
  daily.push({
    href: '/liff/communication-book',
    icon: 'book',
    title: '聯絡簿',
    detail: '填寫與送出今天的聯絡簿',
  });
  if (flags.canReviewLeave || flags.canViewSchoolLeaves) {
    daily.push({ href: '/liff/leave', icon: 'doc', title: '請假審核', detail: '核准或駁回送上來的申請' });
  }
  if (flags.canAnnounce) {
    daily.push({ href: '/liff/announcement', icon: 'mega', title: '公告', detail: '發布給全校或單一班級' });
  }
  if (hasBus && flags.canMarkBusRide) {
    daily.push({ href: '/liff/bus', icon: 'bus', title: '娃娃車', detail: '今天的上下車點名' });
  }

  const manage: Entry[] = [];
  if (flags.canManageSchool) {
    manage.push(
      { href: '/liff/admin/students', icon: 'heart', title: '學生', detail: '新增、調整班級、接送點' },
      { href: '/liff/admin/classes', icon: 'home', title: '班級', detail: '班級與導師指派' },
      { href: '/liff/admin/people', icon: 'user', title: '人員與綁定', detail: '帳號、家長綁定碼' },
      { href: '/liff/admin/roles', icon: 'shield', title: '權限', detail: '一頁看完誰有什麼身分' },
      { href: '/liff/admin/messages', icon: 'send', title: '發送訊息', detail: '送到家長的 LINE，送出後不可收回' },
      { href: '/liff/admin/appearance', icon: 'image', title: '園所外觀', detail: 'LINE 選單、園名、顏色、封面' },
    );
    if (hasBus) {
      manage.push({ href: '/liff/admin/bus', icon: 'bus', title: '娃娃車設定', detail: '路線、接送點、隨車老師' });
    }
  }
  if (flags.canViewAudit) {
    manage.push({ href: '/liff/audit', icon: 'shield', title: '稽核紀錄', detail: '誰在什麼時候改了什麼' });
  }

  return { daily, manage };
}

export function StaffHome({ persona }: { persona: Persona }) {
  const { user } = useSession();
  const { data: config } = usePublicConfig();
  const flags = roleFlags(user.roles);
  const { daily, manage } = entriesFor(persona, flags, Boolean(config?.featureFlags?.bus));

  const title = persona === 'staff' ? '今天的園務' : '今天要做的事';

  return (
    <div className="flex flex-col gap-7">
      <section>
        <SectionHead eyebrow={user.displayName} title={title} />
        <div className="flex flex-col gap-2">
          {daily.map((e) => (
            <Tile key={e.href} icon={e.icon} title={e.title} detail={e.detail} href={e.href} />
          ))}
        </div>
      </section>

      {manage.length > 0 && (
        <section>
          <SectionHead title="管理" description="設定好就不太需要再動的東西" weight="review" />
          <div className="flex flex-col gap-2">
            {manage.map((e) => (
              <Tile
                key={e.href}
                icon={e.icon}
                title={e.title}
                detail={e.detail}
                tone="neutral"
                href={e.href}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
