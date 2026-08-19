'use client';

import { useSelectedStudent } from '../students/useSelectedStudent';
import { BusTodayCard } from './BusTodayCard';
import { EmptyState, ErrorNotice, Segmented, SkeletonCards } from '../../components/ui';

// 家長的娃娃車頁：**我小孩今天上下車了沒。** 沒有第二件事。
//
// 取代舊的 BusView（最後一個聯集視圖）。舊版一頁同時放隨車老師的點名、
// 「查看單一學生」的下拉、以及娃娃車設定的入口，靠 Band 貼標籤區分是誰的 ——
// 而那個下拉裡，隨車老師車上的孩子和他自己的小孩是混在一起的，只能用文案講「都在這個清單裡」。
// 現在身分是分開的殼，這一頁對家長就只剩一張卡（清單也已依身分縮小，見 useVisibleStudents）。
//
// 只有一個小孩的家長不畫選擇器 —— 清單裡只有一個人卻要他先選一次，等於逼他確認自己是誰。
export function ParentBus() {
  const { students, studentId, setStudentId, isLoading, isError } = useSelectedStudent();

  if (isLoading) {
    return <SkeletonCards cards={1} />;
  }
  if (isError) {
    return <ErrorNotice message="現在讀不到孩子的資料，請稍後再打開一次。" />;
  }
  if (students && students.length === 0) {
    return (
      <EmptyState
        title="還沒有連結到孩子的資料"
        hint="請跟園所確認你的 LINE 帳號是不是已經綁定好了"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {students && students.length > 1 && (
        <Segmented
          label="選擇孩子"
          options={students.map((s) => ({ value: s.id, label: s.name }))}
          value={studentId}
          onChange={setStudentId}
        />
      )}
      {studentId && <BusTodayCard studentId={studentId} />}
    </div>
  );
}
