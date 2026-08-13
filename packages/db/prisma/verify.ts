// ============================================================
// Sproutin — Seed Verification (CI assertion, Phase 6 / Step 1)
//
// 在 CI（拋棄式 Postgres）跑完 migrate deploy + seed 後執行，
// 以資料圖語意證明 migration + seed 正確，且符合 RBAC / ADR-002。
// 任一斷言失敗即 exit(1) → CI 紅燈。不需要 localhost。
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

let failures = 0;
function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${name}`, detail !== undefined ? detail : '');
  }
}

async function main(): Promise<void> {
  console.log('[verify] 斷言 Demo seed 資料圖…');

  // 1) 家長 → 只看得到自己的小孩（跨兩班、恰 2 名）
  const parentKids = await prisma.guardianship.findMany({
    where: { userId: 'user-parent' },
    include: { student: true },
  });
  const parentStudentIds = parentKids.map((g) => g.studentId).sort();
  check(
    '家長(user-parent) 監護恰好 2 名小孩',
    parentStudentIds.length === 2,
    parentStudentIds,
  );
  check(
    '家長的小孩跨兩班（sunflower + tulip）',
    JSON.stringify(parentStudentIds) === JSON.stringify(['stu-sun-1', 'stu-tul-1']),
    parentStudentIds,
  );

  // 2) 同一小孩(stu-sun-1) 有 2 位監護人（multiple guardianship）
  const sun1Guardians = await prisma.guardianship.findMany({
    where: { studentId: 'stu-sun-1' },
  });
  check('stu-sun-1 有 2 位監護人', sun1Guardians.length === 2, sun1Guardians.length);

  // 3) 老師 → 只綁自班；向日葵班恰 3 名學生（class isolation）
  const teacherSun = await prisma.teacherAssignment.findMany({
    where: { userId: 'user-teacher-sun' },
  });
  check(
    '林老師只綁 class-sunflower',
    teacherSun.length === 1 && teacherSun[0]?.classId === 'class-sunflower',
    teacherSun.map((t) => t.classId),
  );
  const sunStudents = await prisma.student.count({ where: { classId: 'class-sunflower' } });
  const tulStudents = await prisma.student.count({ where: { classId: 'class-tulip' } });
  check('向日葵班 3 名學生', sunStudents === 3, sunStudents);
  check('鬱金香班 2 名學生', tulStudents === 2, tulStudents);

  // 4) 老師 UserRole scope=CLASS 綁對班（後端授權將依此限縮）
  const teacherRole = await prisma.userRole.findFirst({
    where: { userId: 'user-teacher-sun', role: 'TEACHER' },
  });
  check(
    '林老師 UserRole scope=CLASS 綁 class-sunflower',
    teacherRole?.scopeType === 'CLASS' && teacherRole?.scopeId === 'class-sunflower',
    teacherRole,
  );

  // 5) ADR-002：Derived 投影列 source=LEAVE_EVENT
  const leaveEvent = await prisma.attendance.findUnique({ where: { id: 'att-sun1-leave' } });
  check(
    'att-sun1-leave source=LEAVE_EVENT 且 sourceRef=leave-approved',
    leaveEvent?.source === 'LEAVE_EVENT' && leaveEvent?.sourceRef === 'leave-approved',
    leaveEvent,
  );

  // 6) ADR-002：override 列所有權轉 MANUAL、保留血緣、記覆寫者
  const override = await prisma.attendance.findUnique({ where: { id: 'att-sun2-override' } });
  check(
    'att-sun2-override source=MANUAL',
    override?.source === 'MANUAL',
    override?.source,
  );
  check(
    'att-sun2-override 保留 derivedFrom=leave-override（血緣）',
    override?.derivedFrom === 'leave-override',
    override?.derivedFrom,
  );
  check(
    'att-sun2-override 記錄 overriddenBy',
    override?.overriddenBy === 'user-teacher-sun' && override?.overriddenAt != null,
    { by: override?.overriddenBy, at: override?.overriddenAt },
  );

  // 7) 身分分離：每個 User 皆有 LineIdentity；LINE ID 僅認證（佔位）
  const userCount = await prisma.user.count();
  const lineCount = await prisma.lineIdentity.count();
  check('User 與 LineIdentity 數量一致（1:1 身分分離）', userCount === lineCount, {
    userCount,
    lineCount,
  });

  if (failures > 0) {
    console.error(`\n[verify] 失敗 ${failures} 項 — CI 應為紅燈。`);
    process.exit(1);
  }
  console.log('\n[verify] 全數通過 ✓');
}

main()
  .catch((e) => {
    console.error('[verify] ERROR:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
