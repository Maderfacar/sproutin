'use client';

import { useActivePersona } from '../../lib/usePersona';
import { ParentHome } from '../../features/home/ParentHome';
import { TeacherHome } from '../../features/home/TeacherHome';
import { StaffHome } from '../../features/home/StaffHome';

// 首頁依身分換一整頁，不是同一頁塞三種人的內容。
//
// 家長問的是「我小孩今天怎麼樣」，導師問的是「我今天還有什麼沒做」，
// 園長問的是「全園今天的狀況」—— 這是三個不同的問題，共用一頁一定有兩種人要略過一半。
//
// 行政／園長的首頁在第四批才照新版重做；在那之前先用 StaffHome（依身分列入口的磚塊），
// 已經比舊版的卡片牆好找。隨車老師同樣走 StaffHome，但只有一格。
export default function LiffHomePage() {
  const { persona } = useActivePersona();

  if (persona === 'parent') {
    return <ParentHome />;
  }
  if (persona === 'teacher') {
    return <TeacherHome />;
  }
  return <StaffHome persona={persona} />;
}
