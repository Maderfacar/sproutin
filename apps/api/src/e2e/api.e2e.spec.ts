import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../core/prisma/prisma.service';

// API 級 e2e：以**真實 JWT** 打完整 HTTP pipeline（JwtAuthGuard → RolesGuard → controller zod → service 狀態機），
// 驗證單元測試（直接 new service）攔不到的層：401/403/400/409、路由、guard wiring。
// 用 mocked PrismaService（單一物件同時作 prisma 與 $transaction 的 tx），跑在 build job、不需 DB。

// 單一 mock 物件：$transaction 直接以自身作為 tx client 回呼。
const prismaMock = {
  schoolConfig: { findFirst: jest.fn() },
  leave: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  student: { findUnique: jest.fn() },
  teacherAssignment: { findFirst: jest.fn() },
  guardianship: { findFirst: jest.fn() },
  attendance: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  outboxEvent: { create: jest.fn() },
  auditLog: { create: jest.fn() },
  $transaction: jest.fn(),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// 預設情境：家長 u-parent 是 stu-sun-1 監護人;老師 u-teacher 任教 class-sun。個別測試再覆寫。
function applyDefaults(): void {
  prismaMock.$transaction.mockImplementation(
    async (cb: (t: typeof prismaMock) => Promise<unknown>) => cb(prismaMock),
  );
  prismaMock.schoolConfig.findFirst.mockResolvedValue({ leaveRequiresApproval: true });
  prismaMock.leave.findUnique.mockResolvedValue(null);
  prismaMock.leave.findMany.mockResolvedValue([]);
  prismaMock.leave.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'leave-new',
    studentId: data.studentId,
    dateFrom: new Date(data.dateFrom as string),
    dateTo: new Date(data.dateTo as string),
    reason: data.reason,
    status: data.status,
    reviewedBy: null,
    reviewNote: null,
    createdBy: data.createdBy,
    createdAt: new Date(),
  }));
  prismaMock.leave.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      studentId: 'stu-sun-1',
      dateFrom: new Date(),
      dateTo: new Date(),
      reason: 'r',
      status: data.status,
      reviewedBy: data.reviewedBy ?? null,
      reviewNote: data.reviewNote ?? null,
      createdBy: 'u-parent',
      createdAt: new Date(),
    }),
  );
  prismaMock.student.findUnique.mockResolvedValue({ classId: 'class-sun' });
  prismaMock.teacherAssignment.findFirst.mockResolvedValue({ id: 'ta-1' });
  prismaMock.guardianship.findFirst.mockResolvedValue({ id: 'g-1' });
  prismaMock.attendance.findUnique.mockResolvedValue(null);
  prismaMock.attendance.findMany.mockResolvedValue([]);
  prismaMock.attendance.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'att-new',
    studentId: data.studentId,
    date: new Date(data.date as string),
    status: data.status,
    source: data.source,
    sourceRef: null,
    derivedFrom: null,
    overriddenAt: null,
    overriddenBy: null,
  }));
  prismaMock.attendance.update.mockImplementation(
    async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
      id: where.id,
      studentId: 'stu-sun-1',
      date: new Date(),
      status: data.status,
      source: data.source ?? 'MANUAL',
      sourceRef: data.sourceRef ?? null,
      derivedFrom: data.derivedFrom ?? null,
      overriddenAt: data.overriddenAt ?? null,
      overriddenBy: data.overriddenBy ?? null,
    }),
  );
  prismaMock.outboxEvent.create.mockResolvedValue({});
  prismaMock.auditLog.create.mockResolvedValue({});
}

describe('API e2e (Leave + Attendance, real JWT)', () => {
  let app: INestApplication;
  let parentToken: string;
  let teacherToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const jwt = app.get(JwtService);
    parentToken = await jwt.signAsync({
      sub: 'u-parent',
      roles: [{ role: 'PARENT', scopeType: 'SCHOOL', scopeId: null }],
    });
    teacherToken = await jwt.signAsync({
      sub: 'u-teacher',
      roles: [{ role: 'TEACHER', scopeType: 'CLASS', scopeId: 'class-sun' }],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    applyDefaults();
  });

  const leaveBody = {
    studentId: 'stu-sun-1',
    dateFrom: '2026-08-20T00:00:00.000Z',
    dateTo: '2026-08-21T00:00:00.000Z',
    reason: '感冒',
  };

  it('無 token → 401', async () => {
    await request(app.getHttpServer()).get('/leaves?studentId=stu-sun-1').expect(401);
  });

  it('家長申請請假（需審核）→ 201 PENDING', async () => {
    const res = await request(app.getHttpServer())
      .post('/leaves')
      .set('Authorization', `Bearer ${parentToken}`)
      .send(leaveBody)
      .expect(201);
    expect(res.body.status).toBe('PENDING');
  });

  it('請假 body 不合法 → 400', async () => {
    await request(app.getHttpServer())
      .post('/leaves')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({})
      .expect(400);
  });

  it('家長對非自己小孩申請 → 403', async () => {
    prismaMock.guardianship.findFirst.mockResolvedValue(null); // 無監護關係
    await request(app.getHttpServer())
      .post('/leaves')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ ...leaveBody, studentId: 'stu-other' })
      .expect(403);
  });

  it('老師審核 PENDING → APPROVED → 200', async () => {
    prismaMock.leave.findUnique.mockResolvedValue({ id: 'leave-1', studentId: 'stu-sun-1', status: 'PENDING' });
    const res = await request(app.getHttpServer())
      .patch('/leaves/leave-1/status')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);
    expect(res.body.status).toBe('APPROVED');
  });

  it('對已 APPROVED 的假再審核 → 409 LEAVE_INVALID_TRANSITION', async () => {
    prismaMock.leave.findUnique.mockResolvedValue({ id: 'leave-1', studentId: 'stu-sun-1', status: 'APPROVED' });
    const res = await request(app.getHttpServer())
      .patch('/leaves/leave-1/status')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'APPROVED' })
      .expect(409);
    expect(res.body.message).toContain('LEAVE_INVALID_TRANSITION');
  });

  it('老師手動點名 → 201 MANUAL', async () => {
    const res = await request(app.getHttpServer())
      .post('/attendance')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ studentId: 'stu-sun-1', date: '2026-08-20T00:00:00.000Z', status: 'PRESENT' })
      .expect(201);
    expect(res.body.source).toBe('MANUAL');
  });

  it('老師改 Derived 列 → override 轉 MANUAL → 200', async () => {
    prismaMock.attendance.findUnique.mockResolvedValue({
      id: 'att-le',
      studentId: 'stu-sun-1',
      source: 'LEAVE_EVENT',
      sourceRef: 'leave-9',
      derivedFrom: null,
    });
    const res = await request(app.getHttpServer())
      .patch('/attendance/att-le')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ status: 'ABSENT' })
      .expect(200);
    expect(res.body.source).toBe('MANUAL');
  });

  it('家長打點名端點 → 403（角色不符）', async () => {
    await request(app.getHttpServer())
      .post('/attendance')
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ studentId: 'stu-sun-1', date: '2026-08-20T00:00:00.000Z', status: 'PRESENT' })
      .expect(403);
  });
});
