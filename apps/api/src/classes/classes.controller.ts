import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, AuthedRequest } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClassesService, ClassView } from './classes.service';

// GET /classes — 使用者可見班級（scope 過濾在 service）。老師端點名/公告/審核使用。
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'TEACHER', 'BUS_TEACHER')
  async list(@Req() req: AuthedRequest): Promise<ClassView[]> {
    const user = req.user!;
    return this.classes.listForUser(user.id, user.roles);
  }
}
