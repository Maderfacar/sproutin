import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentsController } from './students.controller';
import { MeStudentsController } from './me-students.controller';
import { StudentsService } from './students.service';

// domain 模組：掛 AuthModule 匯出的 guards（RBAC）。
@Module({
  imports: [AuthModule],
  controllers: [StudentsController, MeStudentsController],
  providers: [StudentsService],
})
export class StudentsModule {}
