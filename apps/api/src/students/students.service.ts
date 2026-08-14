import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';

export interface StudentView {
  id: string;
  name: string;
  classId: string;
}

// Step 3 示範用最小讀取。真正的讀取切片 / Dashboard 於 Step 4 擴充。
@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<StudentView> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      select: { id: true, name: true, classId: true },
    });
    if (!student) {
      throw new NotFoundException('student_not_found');
    }
    return student;
  }
}
