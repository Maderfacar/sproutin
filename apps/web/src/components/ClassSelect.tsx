'use client';

import type { ClassView } from '../lib/types';

interface ClassSelectProps {
  classes: ClassView[] | undefined;
  value: string | undefined;
  onChange: (id: string) => void;
}

// 班級選擇器。單一班級時仍顯示（讓老師確認目前操作的是哪一班）。
export function ClassSelect({ classes, value, onChange }: ClassSelectProps) {
  if (!classes || classes.length === 0) {
    return null;
  }
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-gray-600">班級</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2"
      >
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
