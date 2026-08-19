'use client';

import { useActivePersona } from '../../lib/usePersona';
import { ParentHome } from '../../features/home/ParentHome';
import { StaffHome } from '../../features/home/StaffHome';

// 首頁依身分換一整頁，不是同一頁塞三種人的內容。
//
// 家長問的是「我小孩今天怎麼樣」，導師問的是「我今天還有什麼沒做」，
// 園長問的是「全園今天的狀況」—— 這是三個不同的問題，共用一頁一定有兩種人要略過一半。
//
// 導師與行政的首頁在第三、四批才照新版重做；在那之前先用共同的
// StaffHome（待辦磚塊 + 入口），已經比舊版的卡片牆好找。
export default function LiffHomePage() {
  const { persona } = useActivePersona();

  if (persona === 'parent') {
    return <ParentHome />;
  }
  return <StaffHome persona={persona} />;
}
