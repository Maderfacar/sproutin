'use client';

import { useEffect, useState } from 'react';
import { FEVER_THRESHOLD_C } from '@sproutin/shared';
import { apiErrorMessage } from '../../lib/api';
import type { BookEntryView, HealthSymptom } from '../../lib/types';
import { NOTE_PHRASES, SYMPTOM_LABEL, SYMPTOM_OPTIONS } from './labels';
import { bookErrorMessage, useBookMutations } from './hooks';
import { Button, ErrorNotice, Field, SectionHead } from '../../components/ui';

interface HealthEditorProps {
  studentId: string;
  dateIso: string;
  entry: BookEntryView | undefined;
}

// 健康與留言的編輯（老師端，單一學生）。刻意**不放進直欄模式**：
// 這兩件事是例外情形，一天只有少數幾個孩子需要，逐生處理反而正確也更快。
// 症狀複選、體溫選填（量了才填）、留言可點常用短語帶入 —— 打字是整個流程最慢的一環。
export function HealthEditor({ studentId, dateIso, entry }: HealthEditorProps) {
  const { save } = useBookMutations();
  const [symptoms, setSymptoms] = useState<HealthSymptom[]>([]);
  const [temperature, setTemperature] = useState('');
  const [note, setNote] = useState('');

  // 切換日期或資料載入完成時，把編輯區同步成該日的既有內容。
  useEffect(() => {
    setSymptoms(entry?.symptoms ?? []);
    setTemperature(entry?.temperature !== null && entry?.temperature !== undefined ? String(entry.temperature) : '');
    setNote(entry?.teacherNote ?? '');
  }, [entry?.id, entry?.symptoms, entry?.temperature, entry?.teacherNote]);

  const parsedTemp = temperature.trim() === '' ? null : Number(temperature);
  const tempInvalid = parsedTemp !== null && (Number.isNaN(parsedTemp) || parsedTemp < 30 || parsedTemp > 43);
  const isFever = parsedTemp !== null && !tempInvalid && parsedTemp >= FEVER_THRESHOLD_C;

  function toggleSymptom(s: HealthSymptom): void {
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function submit(): void {
    if (tempInvalid) return;
    save.mutate({
      studentId,
      date: dateIso,
      symptoms,
      temperature: parsedTemp,
      teacherNote: note.trim() === '' ? null : note.trim(),
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-tile border border-line-strong bg-surface p-5 shadow-soft">
      <SectionHead title="健康與留言" description="老師填，家長在聯絡簿上看得到" weight="review" />

      <div>
        <p className="text-2xs font-semibold text-ink-mute mb-2">今日狀況 · 可複選</p>
        <div className="flex flex-wrap gap-1.5">
          {SYMPTOM_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSymptom(s)}
              aria-pressed={symptoms.includes(s)}
              className={`tappable min-h-touch rounded-md2 px-3 text-2xs font-semibold transition border ${
                symptoms.includes(s)
                  ? 'border-note-edge bg-note-wash text-note-text'
                  : 'border-line text-ink-soft'
              }`}
            >
              {SYMPTOM_LABEL[s]}
            </button>
          ))}
        </div>
        {symptoms.length === 0 && <p className="mt-1.5 text-2xs text-ink-mute">未勾選即為無異狀。</p>}
      </div>

      <Field
        label="體溫（選填，量了才填）"
        error={tempInvalid ? '體溫請填 30–43 之間的數字。' : undefined}
      >
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="30"
          max="43"
          value={temperature}
          onChange={(e) => setTemperature(e.target.value)}
          placeholder="例如 37.8"
          className="field"
        />
      </Field>
      {isFever && (
        <p className="-mt-2 text-2xs font-bold text-note-text">
          偏高（{FEVER_THRESHOLD_C}°C 以上）。送出全班時會提醒你是否要立刻通知家長。
        </p>
      )}

      <div>
        <p className="text-2xs font-semibold text-ink-mute mb-2">今日老師記錄 · 可點短語</p>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {NOTE_PHRASES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setNote((prev) => (prev.trim() === '' ? p : `${prev}，${p}`))}
              className="tappable min-h-touch rounded-md2 px-3 text-2xs font-semibold transition border border-line text-ink-soft"
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="選填，沒有特別的事就不用寫"
          className="field"
        />
      </div>

      <Button variant="primary" onClick={submit} disabled={save.isPending || tempInvalid}>
        {save.isPending ? '儲存中…' : '儲存'}
      </Button>

      {save.isError && (
        <ErrorNotice message={bookErrorMessage(save.error, apiErrorMessage(save.error))} />
      )}
    </section>
  );
}
