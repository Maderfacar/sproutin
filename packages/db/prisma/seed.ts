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
    update: {},
    create: {
      id: 'demo-school-config',
      schoolId: 'demo-school',
      brandName: 'Sproutin Demo',
      primaryColor: '#2E7D32',
      secondaryColor: '#A5D6A7',
      cardOrder: ['leave', 'attendance', 'message', 'announcement'],
      featureFlags: { ai: false, health: false, bus: false },
      leaveRequiresApproval: true,
      // LINE / LIFF 公開值 Phase 6（登入步驟）再填；此處留白
      liffId: null,
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
    { id: 'user-owner', displayName: '王園長', lineUserId: 'Udemo_owner' },
    { id: 'user-admin', displayName: '陳行政', lineUserId: 'Udemo_admin' },
    { id: 'user-teacher-sun', displayName: '林老師（向日葵班導）', lineUserId: 'Udemo_teacher_sun' },
    { id: 'user-teacher-tul', displayName: '黃老師（鬱金香班導）', lineUserId: 'Udemo_teacher_tul' },
    { id: 'user-parent', displayName: '張媽媽', lineUserId: 'Udemo_parent' },
    { id: 'user-guardian', displayName: '張爺爺', lineUserId: 'Udemo_guardian' },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { displayName: u.displayName },
      create: { id: u.id, displayName: u.displayName },
    });
    await prisma.lineIdentity.upsert({
      where: { id: `line-${u.id}` },
      update: { lineUserId: u.lineUserId, userId: u.id },
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
