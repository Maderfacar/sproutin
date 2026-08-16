import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RelationsService } from './relations.service';

const guardianshipSchema = z.object({
  userId: z.string().min(1),
  studentId: z.string().min(1),
  relation: z.enum(['FATHER', 'MOTHER', 'GRANDPARENT', 'GUARDIAN']),
  isPrimary: z.boolean().optional(),
});

const assignmentSchema = z.object({
  userId: z.string().min(1),
  classId: z.string().min(1),
});

// 家長 ↔ 學生 綁定（docs/07 §4e）。授權：OWNER/ADMIN。
@Controller('guardianships')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GuardianshipsController {
  constructor(private readonly relations: RelationsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async add(@Req() req: AuthedRequest, @Body() body: unknown): Promise<{ id: string }> {
    const parsed = guardianshipSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.relations.addGuardianship(req.user!, parsed.data);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(204)
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
    return this.relations.removeGuardianship(req.user!, id);
  }
}

// 老師 ↔ 班級 編制（docs/07 §4e）。這是班級層級授權的真正依據（ScopeResolver）。
@Controller('teacher-assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeacherAssignmentsController {
  constructor(private readonly relations: RelationsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN')
  async add(@Req() req: AuthedRequest, @Body() body: unknown): Promise<{ id: string }> {
    const parsed = assignmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('invalid_input');
    }
    return this.relations.addTeacherAssignment(req.user!, parsed.data);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(204)
  async remove(@Req() req: AuthedRequest, @Param('id') id: string): Promise<void> {
    return this.relations.removeTeacherAssignment(req.user!, id);
  }
}
