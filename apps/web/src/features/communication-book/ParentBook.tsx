'use client';

import { useSelectedStudent } from '../students/useSelectedStudent';
import { StudentBookView } from './StudentBookView';
import { EmptyState, Segmented, SkeletonCards } from '../../components/ui';

// 家長的聯絡簿。**只有一個小孩的家長，一進來就是他的聯絡簿** ——
// 舊版會先要求「選擇學生」，可是清單裡只有一個人，等於逼他多按一次確認自己是誰。
//
// 兩個以上的孩子才出現切換，而且是攤開的名字不是下拉。
export function ParentBook() {
  const { students, studentId, setStudentId, isLoading } = useSelectedStudent();

  if (isLoading) {
    return <SkeletonCards cards={2} />;
  }
  if (!students || students.length === 0) {
    return (
      <EmptyState
        title="還沒有連結到孩子的資料"
        hint="請跟園所確認你的 LINE 帳號是不是已經綁定好了"
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {students.length > 1 && (
        <Segmented
          label="選擇孩子"
          options={students.map((s) => ({ value: s.id, label: s.name }))}
          value={studentId}
          onChange={setStudentId}
        />
      )}
      {studentId && <StudentBookView studentId={studentId} canEdit={false} />}
    </div>
  );
}
