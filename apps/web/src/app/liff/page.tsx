'use client';

import { useActivePersona } from '../../lib/usePersona';
import { ParentHome } from '../../features/home/ParentHome';
import { TeacherHome } from '../../features/home/TeacherHome';
import { AdminHome } from '../../features/home/AdminHome';
import { BusHome } from '../../features/home/BusHome';

// 首頁依身分換一整頁，不是同一頁塞三種人的內容。
//
// 家長問的是「我小孩今天怎麼樣」，導師問的是「我今天還有什麼沒做」，
// 園長問的是「全園今天的狀況」—— 這是三個不同的問題，共用一頁一定有兩種人要略過一半。
//
// 隨車老師沒有自己的首頁（他只有一條路線的點名），走 StaffHome 的單格版本。
export default function LiffHomePage() {
  const { persona } = useActivePersona();

  if (persona === 'parent') {
    return <ParentHome />;
  }
  if (persona === 'teacher') {
    return <TeacherHome />;
  }
  if (persona === 'staff') {
    return <AdminHome />;
  }
  // 隨車老師：一條路線點完就關掉，不需要首頁 —— 給他一格入口就好。
  return <BusHome />;
}
