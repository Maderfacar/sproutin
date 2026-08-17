'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import type { BusPointView, BusRouteView, SaveBusRouteBody } from '../../lib/types';

// 一條路線的內容：發車時間、隨車老師、以及接送點清單。
// 由 BusSettingsPanel 使用（桌面與手機共用同一份，差別只有外框）。

export interface StaffOption {
  id: string;
  name: string;
}

interface RouteEditorProps {
  route: BusRouteView;
  staff: StaffOption[];
  // 每個接送點載哪些孩子。door-to-door 之下這是園長最想看到的一欄 ——
  // 「這一站是誰家」才是他腦中的模型，而不是抽象的第幾站。
  ridersByPoint: Map<string, string[]>;
  assignedCount: number;
  busy: boolean;
  onUpdateRoute: (patch: Partial<SaveBusRouteBody>) => void;
  onDeleteRoute: () => void;
  onAddPoint: (input: { name: string; address: string | null }) => void;
  onUpdatePoint: (id: string, patch: { name?: string; address?: string | null; etaAm?: string | null; etaPm?: string | null }) => void;
  onDeletePoint: (id: string) => void;
  onMovePoint: (direction: 'MORNING' | 'AFTERNOON', pointIds: string[]) => void;
}

// 「—」代表這個接送點在該方向不停（沒有孩子在這裡上/下車），不是資料缺漏。
function sortedFor(points: BusPointView[], direction: 'MORNING' | 'AFTERNOON'): BusPointView[] {
  return [...points].sort((a, b) =>
    direction === 'MORNING' ? a.orderAm - b.orderAm : a.orderPm - b.orderPm,
  );
}

function move(ids: string[], index: number, delta: number): string[] {
  const next = [...ids];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}

export function RouteEditor({
  route,
  staff,
  ridersByPoint,
  assignedCount,
  busy,
  onUpdateRoute,
  onDeleteRoute,
  onAddPoint,
  onUpdatePoint,
  onDeletePoint,
  onMovePoint,
}: RouteEditorProps) {
  const [direction, setDirection] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const ordered = sortedFor(route.points, direction);
  const ids = ordered.map((p) => p.id);

  const submitPoint = (): void => {
    const name = newName.trim();
    if (!name) return;
    onAddPoint({ name, address: newAddress.trim() || null });
    setNewName('');
    setNewAddress('');
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field-label">
          <span>路線名稱</span>
          <input
            type="text"
            defaultValue={route.name}
            maxLength={40}
            onBlur={(e) => e.target.value.trim() && onUpdateRoute({ name: e.target.value.trim() })}
            className="field"
          />
        </label>
        <label className="field-label">
          <span>隨車老師</span>
          <select
            value={route.busTeacherId ?? ''}
            onChange={(e) => onUpdateRoute({ busTeacherId: e.target.value || null })}
            className="field"
          >
            <option value="">尚未指派</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>上午發車</span>
          <input
            type="time"
            defaultValue={route.morningDepart ?? ''}
            onBlur={(e) => onUpdateRoute({ morningDepart: e.target.value || null })}
            className="field"
          />
        </label>
        <label className="field-label">
          <span>下午發車</span>
          <input
            type="time"
            defaultValue={route.afternoonDepart ?? ''}
            onBlur={(e) => onUpdateRoute({ afternoonDepart: e.target.value || null })}
            className="field"
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={route.isActive}
          onChange={(e) => onUpdateRoute({ isActive: e.target.checked })}
        />
        啟用這條路線
      </label>

      <div className="border-t border-line pt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="eyebrow">接送點（{route.points.length}）</p>
          <div className="ml-auto flex overflow-hidden rounded-md2 border border-line">
            {(['MORNING', 'AFTERNOON'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`px-3 py-1.5 text-xs font-semibold ${
                  direction === d ? 'bg-brand-primary text-white' : 'text-ink-soft'
                }`}
              >
                {d === 'MORNING' ? '上午順序' : '下午順序'}
              </button>
            ))}
          </div>
        </div>

        {direction === 'AFTERNOON' && (
          <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
            <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
            {route.afternoonCustomOrder
              ? '下午順序已經自己排過，之後新增接送點不會再自動重排。'
              : '下午預設是上午倒過來（原路開回去）。在這裡調整過之後，下午就走自己的順序。'}
          </p>
        )}

        {ordered.length === 0 ? (
          <p className="border-t border-line py-5 text-center text-sm text-ink-soft">
            還沒有接送點。娃娃車是開到孩子家門口，所以先把每一戶加進來。
          </p>
        ) : (
          <ul className="border-t border-line">
            {ordered.map((point, index) => (
              <li key={point.id} className="border-b border-line py-3">
                <div className="flex items-center gap-3">
                  <span className="w-5 shrink-0 text-xs font-bold text-ink-soft">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{point.name}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {point.address || '未填地址'}
                      {' · '}
                      上午 {point.etaAm || '—'} / 下午 {point.etaPm || '—'}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {/* 「還沒有人」不是錯誤，是提示下一步：去學生那頁把孩子掛上來。 */}
                      載：{(ridersByPoint.get(point.id) ?? []).join('、') || '還沒有人'}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`${point.name} 往上`}
                    disabled={busy || index === 0}
                    onClick={() => onMovePoint(direction, move(ids, index, -1))}
                    className="btn-secondary shrink-0 px-2 py-1 text-xs"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`${point.name} 往下`}
                    disabled={busy || index === ordered.length - 1}
                    onClick={() => onMovePoint(direction, move(ids, index, 1))}
                    className="btn-secondary shrink-0 px-2 py-1 text-xs"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(editingId === point.id ? null : point.id)}
                    className="btn-secondary shrink-0 text-xs"
                  >
                    {editingId === point.id ? '收合' : '編輯'}
                  </button>
                </div>

                {editingId === point.id && (
                  <div className="mt-3 grid gap-2 rounded-md2 border border-line p-3 sm:grid-cols-2">
                    <label className="field-label">
                      <span>名稱</span>
                      <input
                        type="text"
                        defaultValue={point.name}
                        maxLength={40}
                        onBlur={(e) =>
                          e.target.value.trim() && onUpdatePoint(point.id, { name: e.target.value.trim() })
                        }
                        className="field"
                      />
                    </label>
                    <label className="field-label">
                      <span>地址（選填）</span>
                      <input
                        type="text"
                        defaultValue={point.address ?? ''}
                        maxLength={120}
                        onBlur={(e) => onUpdatePoint(point.id, { address: e.target.value.trim() || null })}
                        className="field"
                      />
                    </label>
                    <label className="field-label">
                      <span>上午預計時間</span>
                      <input
                        type="time"
                        defaultValue={point.etaAm ?? ''}
                        onBlur={(e) => onUpdatePoint(point.id, { etaAm: e.target.value || null })}
                        className="field"
                      />
                    </label>
                    <label className="field-label">
                      <span>下午預計時間</span>
                      <input
                        type="time"
                        defaultValue={point.etaPm ?? ''}
                        onBlur={(e) => onUpdatePoint(point.id, { etaPm: e.target.value || null })}
                        className="field"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onDeletePoint(point.id)}
                      className="btn-secondary text-xs text-red-700 sm:col-span-2"
                    >
                      刪除這個接送點
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            type="text"
            value={newName}
            maxLength={40}
            placeholder="接送點名稱，例如「陳家」"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitPoint()}
            className="field"
          />
          <input
            type="text"
            value={newAddress}
            maxLength={120}
            placeholder="地址（選填）"
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitPoint()}
            className="field"
          />
          <button
            type="button"
            onClick={submitPoint}
            disabled={busy || newName.trim().length === 0}
            className="btn-primary shrink-0 text-sm"
          >
            新增接送點
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-4">
        <p className="text-xs text-ink-soft">目前有 {assignedCount} 個孩子搭這條路線。</p>
        <button
          type="button"
          disabled={busy}
          onClick={onDeleteRoute}
          className="btn-secondary ml-auto text-xs text-red-700"
        >
          刪除路線
        </button>
      </div>
    </div>
  );
}
