import { BadRequestException, Body, Controller, Get, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { BookEntryView, CommunicationBookService } from './communication-book.service';

// 邊界輸入驗證（zod），inline 於 controller —— 比照 auth / leaves / attendance controller
// （api 不從 shared 取執行期值）。
// 老師以勾選為主：**每個欄位都可留空**（未記錄），不強制必填 —— 強迫填寫只會逼出假資料。
// 體溫合理範圍 30–43°C（超出多為誤植）；症狀可複選，空陣列即「無異狀」。
const MEAL = ['ALL', 'MOST', 'HALF', 'LITTLE', 'NONE'] as const;
const NAP = ['WELL', 'SHORT', 'NONE'] as const;
const TOILET = ['NORMAL', 'LOOSE', 'HARD', 'NONE'] as const;
const MOOD = ['HAPPY', 'CALM', 'SLEEPY', 'LOW'] as const;
const SYMPTOM = [
  'COUGH',
  'RUNNY_NOSE',
  'SORE_THROAT',
  'DIARRHEA',
  'VOMITING',
  'POOR_APPETITE',
  'LOW_ENERGY',
  'RASH',
] as const;
const PICKUP = ['FAMILY', 'SCHOOL_BUS'] as const;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const saveSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().datetime(),
  arrivalTime: z.string().regex(HHMM).nullable().optional(),
  lunch: z.enum(MEAL).nullable().optional(),
  snack: z.enum(MEAL).nullable().optional(),
  nap: z.enum(NAP).nullable().optional(),
  toilet: z.enum(TOILET).nullable().optional(),
  mood: z.enum(MOOD).nullable().optional(),
  symptoms: z.array(z.enum(SYMPTOM)).max(SYMPTOM.length).optional(),
  temperature: z.number().min(30).max(43).nullable().optional(),
  pickup: z.enum(PICKUP).nullable().optional(),
  teacherNote: z.string().max(1000).nullable().optional(),
});

const checkInSchema = z.object({
  studentId: z.string().min(1),
  date: z.string().datetime(),
  arrivalTime: z.string().regex(HHMM),
  status: z.enum(['PRESENT', 'LATE']).default('PRESENT'),
});

const publishSchema = z.object({
  classId: z.string().min(1),
  date: z.string().datetime(),
  pushStudentIds: z.array(z.string().min(1)).max(200).default([]),
});

// 每日聯絡簿端點（docs/07 §4f）。授權鏈：JwtAuthGuard → RolesGuard（粗粒度）；
// 資料列級（自班 / 自己小孩）在 service 內以 ScopeResolver 判斷（前端不決定授權）。
@Controller('communication-book')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommunicationBookController {
  constructor(private readonly book: CommunicationBookService) {}

  // GET ?classId=&date=（校方整班）｜ ?studentId=&date= 或 ?studentId=&from=&to=（單生／回溯）
  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER', 'PARENT', 'GUARDIAN')
  async list(
    @Req() req: AuthedRequest,
    @Query('classId') classId?: string,
    @Query('studentId') studentId?: string,
    @Query('date') date?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<BookEntryView[]> {
    if (studentId) {
      return this.book.listByStudent(req.user!, studentId, { date, from, to });
    }
    if (classId) {
      if (!date) throw new BadRequestException('date_required');
      return this.book.listByClass(req.user!, classId, date);
    }
    throw new BadRequestException('classId_or_studentId_required');
  }

  // PUT — 填寫／修改當日紀錄（局部更新；未提供的欄位不動）。
  @Put()
  @Roles('ADMIN', 'TEACHER')
  async save(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BookEntryView> {
    const parsed = saveSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.book.save(req.user!, parsed.data);
  }

  // POST /check-in — 點名即到校（同時寫出缺勤與到校時間）。
  @Post('check-in')
  @Roles('ADMIN', 'TEACHER')
  async checkIn(@Req() req: AuthedRequest, @Body() body: unknown): Promise<BookEntryView> {
    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.book.checkIn(req.user!, parsed.data);
  }

  // POST /publish — 一鍵送出全班；pushStudentIds 為老師選擇立即 LINE 通知者。
  @Post('publish')
  @Roles('ADMIN', 'TEACHER')
  async publish(
    @Req() req: AuthedRequest,
    @Body() body: unknown,
  ): Promise<{ published: number; pushed: number }> {
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException('invalid_input');
    return this.book.publish(req.user!, parsed.data);
  }
}
