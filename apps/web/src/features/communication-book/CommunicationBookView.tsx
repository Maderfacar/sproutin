'use client';

import { StudentSelect } from '../../components/StudentSelect';
import { useSelectedStudent } from '../students/useSelectedStudent';
import { TeacherBookPanel } from './TeacherBookPanel';
import { StudentBookView } from './StudentBookView';
import { useSession } from '../../lib/session';
import { roleFlags } from '../../lib/roles';
import { SkeletonLines } from '../../components/Skeleton';
import { Band } from '../../components/Band';

// 每日聯絡簿（聯集視圖）。老師／行政先看整班記錄面板；任何看得到學生的人都能翻閱該生聯絡簿。
// 聯絡簿是「一個孩子的頁面」：當日狀態在上、親師對話在下，訊息功能已併入此處。
// 桌面版 /admin/communication-book 與手機版 /liff/communication-book 共用這一份（docs/04 §3b）。
//
// 打磨第二階段（Human Owner 2026-08-18）：這一頁原本是八個同樣份量的區塊一路疊下來，
// 像一篇沒有標點的文章。改用 components/Band 斷句 ——「今天要做的事」在上且份量重，
// 「翻閱查詢」在下且收斂。
export function CommunicationBookView() {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  // 下面這一區對純家長來說就是「我小孩的聯絡簿」，對老師來說是「翻閱我班上的任何一個孩子」。
  // 兩者混在同一個清單裡（老師兼家長會同時看到班上小孩與自己小孩），而 session 並沒有帶
  // 「哪些學生是我的小孩」——所以這裡**不貼身分籤**（貼了就有貼錯的一半），改用文字講清楚。
  const reviewTitle = flags.isStaff ? '翻閱單一學生' : '聯絡簿';
  const reviewDescription = flags.hasDualIdentity
    ? '你帶的班級和你自己的小孩都在這個清單裡'
    : flags.isStaff
      ? '選一個孩子，看他今天與過去的紀錄'
      : '老師送出後這裡就會更新';

  return (
    <div>
      {flags.canMarkAttendance && (
        <Band
          kind="action"
          title="今天要填的聯絡簿"
          description="選班級與日期，填完再送出給家長"
          audience="staff"
        >
          <TeacherBookPanel />
        </Band>
      )}

      <Band kind="review" title={reviewTitle} description={reviewDescription}>
        <div className="flex flex-col gap-3">
          {isLoading && <SkeletonLines lines={1} />}
          {isError && <p className="text-sm text-stop-text">無法載入學生清單。</p>}
          {students && students.length === 0 && (
            <p className="text-sm text-ink-soft">目前沒有可查看的學生。</p>
          )}
          <StudentSelect students={students} value={studentId} onChange={setStudentId} />
          {studentId && <StudentBookView studentId={studentId} canEdit={flags.canMarkAttendance} />}
        </div>
      </Band>
    </div>
  );
}

// 單一學生的聯絡簿（老師從直欄模式點進來、家長從首頁摘要點進來）。
// 授權完全由後端決定：老師只開得了自班學生、家長只開得了自己小孩。
export function StudentBookScreen({ studentId }: { studentId: string }) {
  const { user } = useSession();
  const flags = roleFlags(user.roles);
  return <StudentBookView studentId={studentId} canEdit={flags.canMarkAttendance} />;
}
