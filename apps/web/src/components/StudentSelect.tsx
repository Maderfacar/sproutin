'use client';

import type { StudentView } from '../lib/auth';

interface StudentSelectProps {
  students: StudentView[] | undefined;
  value: string | undefined;
  onChange: (id: string) => void;
}

// 學生選擇器。只有一位學生時不顯示（無需選）。
export function StudentSelect({ students, value, onChange }: StudentSelectProps) {
  if (!students || students.length <= 1) {
    return null;
  }
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">選擇學生</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2"
      >
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
