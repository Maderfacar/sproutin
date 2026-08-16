// ============================================================
// Sproutin — Synthetic Demo Seed (Phase 6 / Step 1)
//
// 目的：為「一間 Demo School」建立可重入（idempotent）的 synthetic 測試資料，
//       支撐 Phase 6 讀取切片（家長→自己小孩、老師→自班）與 ADR-002 衝突情境。
//
// 原則：
//  - 全部使用固定 id 的 upsert → 重跑不會重複、可安全於 CI 與 Render one-off job 執行。
//  - 只用「合成 / demo 資料」，不含任何真實兒童 / 家長 PII（docs/project/05 §5）。
//  - LINE User ID 僅供認證對映（佔位值），不得作為業務外鍵（修正 D / docs/02）。
//  - 只建立 MVP 範圍實體，不觸碰 Future domain（Health/Bus/…）。
//
// 安全閘門：僅在 SEED_DEMO=true 或 SCHOOL_SLUG=dev 時執行，
//          避免誤植正式（real-slug）學校 DB。
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Demo School 的公開 LIFF_ID（Phase 6 Step 2；公開值，走 /config/public，ADR-001）。
const DEMO_LIFF_ID = '2011106015-hbS1EASz';

// 手機實測用：把 Human Owner 的真實 LINE User ID 對映到 user-owner（園長）。
// 真值由 Render seed job 的 env DEMO_OWNER_LINE_USER_ID 帶入，**不寫進 repo**。
const OWNER_LINE_USER_ID = process.env.DEMO_OWNER_LINE_USER_ID ?? 'Udemo_owner';

// ---- 安全閘門 --------------------------------------------------------------
function assertSeedAllowed(): void {
  const allowed =
    process.env.SEED_DEMO === 'true' || process.env.SCHOOL_SLUG === 'dev';
  if (!allowed) {
    console.error(
      '[seed] REFUSED: demo seed 僅允許於 SEED_DEMO=true 或 SCHOOL_SLUG=dev。' +
        '\n[seed] 目前環境不符合，為避免誤植正式學校 DB，已中止。',
    );
    process.exit(1);
  }
}

// ---- 固定日期（避免每次執行漂移，維持 idempotent）--------------------------
const D_LEAVE = new Date('2026-08-10T00:00:00.000Z'); // stu-sun-1 已核准請假日
const D_OVERRIDE = new Date('2026-08-11T00:00:00.000Z'); // stu-sun-2 被老師覆寫日
const D_PRESENT = new Date('2026-08-12T00:00:00.000Z'); // stu-sun-3 一般手動出勤日
const NOW = new Date('2026-08-13T09:00:00.000Z'); // override 時間（固定）

// 聯絡簿的 demo 日期採「相對今天」——demo 用途上，翻開必須看到最近幾天有內容，
// 若寫死日期，過一陣子 demo 就會變成一片空白。id 仍固定，重跑只更新日期（idempotent）。
const MS_PER_DAY = 86_400_000;
function daysAgo(n: number): Date {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(today - n * MS_PER_DAY);
}

async function main(): Promise<void> {
  assertSeedAllowed();

  // -------- 1. School + SchoolConfig (SoT) --------
  await prisma.school.upsert({
    where: { id: 'demo-school' },
    update: { name: 'Sproutin Demo 幼兒園' },
    create: { id: 'demo-school', name: 'Sproutin Demo 幼兒園' },
  });

  await prisma.schoolConfig.upsert({
    where: { id: 'demo-school-config' },
    update: { liffId: DEMO_LIFF_ID },
    create: {
      id: 'demo-school-config',
      schoolId: 'demo-school',
      brandName: 'Sproutin Demo',
      primaryColor: '#2E7D32',
      secondaryColor: '#A5D6A7',
      cardOrder: ['communication-book', 'leave', 'attendance', 'announcement'],
      // demo 園所預設展示完整產品藍圖：規劃中的功能一併開啟（前端顯示為「即將推出」+ 預告頁）。
      // 正式園所可於「園所外觀」設定頁自行開關（Human Owner 決策 2026-08-17）。
      featureFlags: {
        ai: false,
        bus: true,
        payment: true,
        portfolio: true,
        forms: true,
        calendar: true,
        health: true,
      },
      leaveRequiresApproval: true,
      // LIFF_ID 公開（Step 2）走 /config/public；channel secret/token 走 env（ADR-004）
      liffId: DEMO_LIFF_ID,
      lineOaChannelId: null,
      lineOaBasicId: null,
      apiBaseUrl: null,
    },
  });

  // -------- 2. Classes（2 班，測 class isolation）--------
  const classes: Array<{ id: string; name: string }> = [
    { id: 'class-sunflower', name: '向日葵班' },
    { id: 'class-tulip', name: '鬱金香班' },
  ];
  for (const c of classes) {
    await prisma.class.upsert({
      where: { id: c.id },
      update: { name: c.name },
      create: { id: c.id, schoolId: 'demo-school', name: c.name },
    });
  }

  // -------- 3. Students（5 名，跨兩班）--------
  const students: Array<{ id: string; classId: string; name: string }> = [
    { id: 'stu-sun-1', classId: 'class-sunflower', name: '范小星' },
    { id: 'stu-sun-2', classId: 'class-sunflower', name: '范小陽' },
    { id: 'stu-sun-3', classId: 'class-sunflower', name: '范小花' },
    { id: 'stu-tul-1', classId: 'class-tulip', name: '范小鬱' },
    { id: 'stu-tul-2', classId: 'class-tulip', name: '范小香' },
  ];
  for (const s of students) {
    await prisma.student.upsert({
      where: { id: s.id },
      update: { name: s.name, classId: s.classId },
      create: { id: s.id, classId: s.classId, name: s.name },
    });
  }

  // -------- 4. Users + LineIdentity（LINE ID 僅認證佔位）--------
  const users: Array<{ id: string; displayName: string; lineUserId: string }> = [
    { id: 'user-owner', displayName: '王園長', lineUserId: OWNER_LINE_USER_ID },
    { id: 'user-admin', displayName: '陳行政', lineUserId: 'Udemo_admin' },
    { id: 'user-teacher-sun', displayName: '林老師（向日葵班導）', lineUserId: 'Udemo_teacher_sun' },
    { id: 'user-teacher-tul', displayName: '黃老師（鬱金香班導）', lineUserId: 'Udemo_teacher_tul' },
    { id: 'user-parent', displayName: '張媽媽', lineUserId: 'Udemo_parent' },
    { id: 'user-guardian', displayName: '張爺爺', lineUserId: 'Udemo_guardian' },
  ];
  // 園長是否於本次執行明確帶入真實 LINE userId（env）。未帶入時，重跑 seed **不覆寫**既有
  // 園長 LINE 對映（避免把線上真實登入 id 清成佔位 'Udemo_owner' 而弄壞登入）。
  // 需改對映時才帶 DEMO_OWNER_LINE_USER_ID 重跑（沿用 Phase 6 修正對映的做法）。
  const ownerLineProvided =
    process.env.DEMO_OWNER_LINE_USER_ID != null && process.env.DEMO_OWNER_LINE_USER_ID !== '';

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { displayName: u.displayName },
      create: { id: u.id, displayName: u.displayName },
    });
    const preserveOwnerLine = u.id === 'user-owner' && !ownerLineProvided;
    await prisma.lineIdentity.upsert({
      where: { id: `line-${u.id}` },
      update: preserveOwnerLine ? { userId: u.id } : { lineUserId: u.lineUserId, userId: u.id },
      create: { id: `line-${u.id}`, lineUserId: u.lineUserId, userId: u.id },
    });
  }

  // -------- 5. UserRole（粗粒度角色；scope=CLASS 給老師）--------
  const roles: Array<{
    id: string;
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'TEACHER' | 'BUS_TEACHER' | 'PARENT' | 'GUARDIAN';
    scopeType: 'SCHOOL' | 'CLASS';
    scopeId: string | null;
  }> = [
    { id: 'role-owner', userId: 'user-owner', role: 'OWNER', scopeType: 'SCHOOL', scopeId: null },
    { id: 'role-admin', userId: 'user-admin', role: 'ADMIN', scopeType: 'SCHOOL', scopeId: null },
    { id: 'role-teacher-sun', userId: 'user-teacher-sun', role: 'TEACHER', scopeType: 'CLASS', scopeId: 'class-sunflower' },
    { id: 'role-teacher-tul', userId: 'user-teacher-tul', role: 'TEACHER', scopeType: 'CLASS', scopeId: 'class-tulip' },
    { id: 'role-parent', userId: 'user-parent', role: 'PARENT', scopeType: 'SCHOOL', scopeId: null },
    { id: 'role-guardian', userId: 'user-guardian', role: 'GUARDIAN', scopeType: 'SCHOOL', scopeId: null },
  ];

  // P5 LINE 推播「單帳號自測」demo fixture（opt-in;預設不建,避免污染標準/正式 seed）。
  // 設 SEED_PUSH_DEMO=true 才給園長額外 ADMIN（可核准）+ 監護 stu-sun-2（成為推播收件人）;
  // 核准請假不排除操作者 → 園長核准自己監護小孩的請假 → 自己手機收到 LINE 推播。
  const pushDemo = process.env.SEED_PUSH_DEMO === 'true';
  if (pushDemo) {
    roles.push({ id: 'role-owner-admin', userId: 'user-owner', role: 'ADMIN', scopeType: 'SCHOOL', scopeId: null });
  }
  for (const r of roles) {
    await prisma.userRole.upsert({
      where: { id: r.id },
      update: { role: r.role, scopeType: r.scopeType, scopeId: r.scopeId },
      create: r,
    });
  }

  // -------- 6. TeacherAssignment（老師↔班）--------
  const assignments: Array<{ id: string; userId: string; classId: string }> = [
    { id: 'ta-sun', userId: 'user-teacher-sun', classId: 'class-sunflower' },
    { id: 'ta-tul', userId: 'user-teacher-tul', classId: 'class-tulip' },
  ];
  for (const a of assignments) {
    await prisma.teacherAssignment.upsert({
      where: { id: a.id },
      update: {},
      create: { id: a.id, userId: a.userId, classId: a.classId, role: 'HOMEROOM' },
    });
  }

  // -------- 7. Guardianship（家長多小孩跨班 + 同一小孩多監護人）--------
  const guardianships: Array<{
    id: string;
    userId: string;
    studentId: string;
    relation: 'FATHER' | 'MOTHER' | 'GRANDPARENT' | 'GUARDIAN';
    isPrimary: boolean;
  }> = [
    // 張媽媽：兩個小孩，分屬兩班（測跨班多小孩 + 隔離）
    { id: 'g-parent-sun1', userId: 'user-parent', studentId: 'stu-sun-1', relation: 'MOTHER', isPrimary: true },
    { id: 'g-parent-tul1', userId: 'user-parent', studentId: 'stu-tul-1', relation: 'MOTHER', isPrimary: true },
    // 張爺爺：同一小孩（stu-sun-1）的第二位監護人（測 multiple guardianship）
    { id: 'g-guardian-sun1', userId: 'user-guardian', studentId: 'stu-sun-1', relation: 'GRANDPARENT', isPrimary: false },
  ];

  // P5 推播 demo（opt-in,同上 SEED_PUSH_DEMO）：園長監護 stu-sun-2（范小陽,無其他監護人）→
  // 核准其請假時只有園長真 LINE 收播,無雜訊。
  if (pushDemo) {
    guardianships.push({ id: 'g-owner-push', userId: 'user-owner', studentId: 'stu-sun-2', relation: 'GUARDIAN', isPrimary: false });
  }
  for (const g of guardianships) {
    await prisma.guardianship.upsert({
      where: { id: g.id },
      update: { relation: g.relation, isPrimary: g.isPrimary },
      create: g,
    });
  }

  // -------- 8. Demo 業務資料：Leave --------
  // (a) 已核准請假 → 會投影 Attendance(source=LEAVE_EVENT)
  await prisma.leave.upsert({
    where: { id: 'leave-approved' },
    update: {},
    create: {
      id: 'leave-approved',
      studentId: 'stu-sun-1',
      dateFrom: D_LEAVE,
      dateTo: D_LEAVE,
      reason: '感冒發燒',
      status: 'APPROVED',
      reviewedBy: 'user-teacher-sun',
      reviewNote: '已核准',
      createdBy: 'user-parent',
    },
  });
  // (b) 已核准請假，但老師人工覆寫出勤（ADR-002 衝突情境）
  await prisma.leave.upsert({
    where: { id: 'leave-override' },
    update: {},
    create: {
      id: 'leave-override',
      studentId: 'stu-sun-2',
      dateFrom: D_OVERRIDE,
      dateTo: D_OVERRIDE,
      reason: '家庭因素',
      status: 'APPROVED',
      reviewedBy: 'user-teacher-sun',
      createdBy: 'user-parent',
    },
  });

  // -------- 9. Demo 業務資料：Attendance --------
  // (a) 由 leave-approved 投影：source=LEAVE_EVENT（Derived）
  await prisma.attendance.upsert({
    where: { id: 'att-sun1-leave' },
    update: {},
    create: {
      id: 'att-sun1-leave',
      studentId: 'stu-sun-1',
      date: D_LEAVE,
      status: 'LEAVE',
      source: 'LEAVE_EVENT',
      sourceRef: 'leave-approved',
      derivedFrom: 'leave-approved',
    },
  });
  // (b) 原為 Derived，老師人工改為 PRESENT → 所有權轉 MANUAL，保留血緣（ADR-002）
  await prisma.attendance.upsert({
    where: { id: 'att-sun2-override' },
    update: {},
    create: {
      id: 'att-sun2-override',
      studentId: 'stu-sun-2',
      date: D_OVERRIDE,
      status: 'PRESENT',
      source: 'MANUAL',
      sourceRef: null,
      derivedFrom: 'leave-override', // 血緣保留（衝突偵測/稽核）
      overriddenAt: NOW,
      overriddenBy: 'user-teacher-sun',
    },
  });
  // (c) 純手動出勤
  await prisma.attendance.upsert({
    where: { id: 'att-sun3-present' },
    update: {},
    create: {
      id: 'att-sun3-present',
      studentId: 'stu-sun-3',
      date: D_PRESENT,
      status: 'PRESENT',
      source: 'MANUAL',
    },
  });

  // -------- 10. Demo 業務資料：Announcement --------
  await prisma.announcement.upsert({
    where: { id: 'ann-school' },
    update: {},
    create: {
      id: 'ann-school',
      schoolId: 'demo-school',
      classId: null,
      scope: 'SCHOOL',
      title: '歡迎使用 Sproutin Demo',
      body: '這是一則全校公告（synthetic demo 資料）。',
      createdBy: 'user-owner',
    },
  });
  await prisma.announcement.upsert({
    where: { id: 'ann-class-sun' },
    update: {},
    create: {
      id: 'ann-class-sun',
      schoolId: 'demo-school',
      classId: 'class-sunflower',
      scope: 'CLASS',
      title: '向日葵班本週活動',
      body: '本週五戶外教學（synthetic demo 資料）。',
      createdBy: 'user-teacher-sun',
    },
  });

  // -------- 11. Demo 業務資料：每日聯絡簿（階段2 刀4）--------
  // 向日葵班近三天的紀錄。刻意做出三種狀態，demo 時三種畫面都看得到：
  //   ① 已送出且一切順利 ② 已送出但健康需注意（體溫偏高 + 症狀）③ 今天尚未送出（老師記錄中）
  const bookEntries: Array<{
    id: string;
    studentId: string;
    date: Date;
    arrivalTime: string;
    lunch: 'ALL' | 'MOST' | 'HALF' | 'LITTLE' | 'NONE';
    snack: 'ALL' | 'MOST' | 'HALF' | 'LITTLE' | 'NONE';
    nap: 'WELL' | 'SHORT' | 'NONE';
    toilet: 'NORMAL' | 'LOOSE' | 'HARD' | 'NONE';
    mood: 'HAPPY' | 'CALM' | 'SLEEPY' | 'LOW';
    symptoms: Array<'COUGH' | 'RUNNY_NOSE' | 'LOW_ENERGY'>;
    temperature: number | null;
    pickup: 'FAMILY' | 'SCHOOL_BUS';
    teacherNote: string | null;
    published: boolean;
  }> = [
    {
      id: 'cb-sun1-d2',
      studentId: 'stu-sun-1',
      date: daysAgo(2),
      arrivalTime: '08:05',
      lunch: 'ALL',
      snack: 'ALL',
      nap: 'WELL',
      toilet: 'NORMAL',
      mood: 'HAPPY',
      symptoms: [],
      temperature: null,
      pickup: 'FAMILY',
      teacherNote: '今天主動幫忙收玩具，午睡起來精神很好。',
      published: true,
    },
    {
      id: 'cb-sun2-d2',
      studentId: 'stu-sun-2',
      date: daysAgo(2),
      arrivalTime: '08:20',
      lunch: 'MOST',
      snack: 'ALL',
      nap: 'SHORT',
      toilet: 'NORMAL',
      mood: 'CALM',
      symptoms: [],
      temperature: null,
      pickup: 'SCHOOL_BUS',
      teacherNote: null,
      published: true,
    },
    {
      id: 'cb-sun1-d1',
      studentId: 'stu-sun-1',
      date: daysAgo(1),
      arrivalTime: '08:12',
      lunch: 'HALF',
      snack: 'LITTLE',
      nap: 'SHORT',
      toilet: 'LOOSE',
      mood: 'LOW',
      symptoms: ['COUGH', 'RUNNY_NOSE'],
      temperature: 37.8,
      pickup: 'FAMILY',
      teacherNote: '午後略有咳嗽，已多補充水分並安排休息，請家長留意。',
      published: true,
    },
    {
      id: 'cb-sun3-d1',
      studentId: 'stu-sun-3',
      date: daysAgo(1),
      arrivalTime: '08:30',
      lunch: 'ALL',
      snack: 'ALL',
      nap: 'WELL',
      toilet: 'NORMAL',
      mood: 'HAPPY',
      symptoms: [],
      temperature: null,
      pickup: 'FAMILY',
      teacherNote: null,
      published: true,
    },
    {
      id: 'cb-sun1-d0',
      studentId: 'stu-sun-1',
      date: daysAgo(0),
      arrivalTime: '08:08',
      lunch: 'ALL',
      snack: 'ALL',
      nap: 'WELL',
      toilet: 'NORMAL',
      mood: 'HAPPY',
      symptoms: [],
      temperature: null,
      pickup: 'FAMILY',
      teacherNote: null,
      published: false, // 老師仍在記錄中 → 家長端顯示「放學前會送出」
    },
  ];

  for (const e of bookEntries) {
    const { id, published, ...fields } = e;
    const data = { ...fields, filledBy: 'user-teacher-sun', publishedAt: published ? NOW : null };
    await prisma.communicationBookEntry.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
  }

  // -------- 摘要（供 CI / Render job log 作為驗證證據）--------
  const counts = {
    school: await prisma.school.count(),
    schoolConfig: await prisma.schoolConfig.count(),
    class: await prisma.class.count(),
    student: await prisma.student.count(),
    user: await prisma.user.count(),
    lineIdentity: await prisma.lineIdentity.count(),
    userRole: await prisma.userRole.count(),
    guardianship: await prisma.guardianship.count(),
    teacherAssignment: await prisma.teacherAssignment.count(),
    leave: await prisma.leave.count(),
    attendance: await prisma.attendance.count(),
    announcement: await prisma.announcement.count(),
    communicationBookEntry: await prisma.communicationBookEntry.count(),
  };
  console.log('[seed] OK — Demo School 已就緒（idempotent）。counts=', counts);
}

main()
  .catch((e) => {
    console.error('[seed] FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
