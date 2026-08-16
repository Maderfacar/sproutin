import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';

// 班級 domain 模組（Step 7c）。imports AuthModule（guards）。
@Module({
  imports: [AuthModule],
  controllers: [ClassesController],
  providers: [ClassesService],
})
export class ClassesModule {}
