'use client';

import { useState } from 'react';
import { Icon } from '../../components/Icon';
import type { BusPointView, BusRouteView, SaveBusRouteBody } from '../../lib/types';
import { Button, EmptyState, Field, Segmented, Sheet } from '../../components/ui';

// 一條路線的內容：發車時間、隨車老師、以及接送點清單。
// 由 BusSettingsPanel 使用（桌面與手機共用同一份，差別只有外框）。
//
// 版型（清葉加厚，2026-08-20）：頁面上留下的是**清單**（這條路線停哪幾站、每站載誰），
// 每一種填表都收進底部面板。舊版把路線名稱、隨車老師、兩個發車時間全部攤在展開區裡，
// 而且是「失焦就存」—— 沒有任何「存好了」的訊號，園長改完不確定有沒有進去。
// 現在改成面板裡填完按一顆「儲存」。
//
// 面板故意不互相疊：刪除的確認是**關掉編輯面板、再開確認面板**，
// 不是在原地把按鈕展開成兩顆（就地展開最容易誤按），也不是把 dialog 疊在 dialog 上。

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
  onUpdatePoint: (
    id: string,
    patch: { name?: string; address?: string | null; etaAm?: string | null; etaPm?: string | null },
  ) => void;
  onDeletePoint: (id: string) => void;
  onMovePoint: (direction: 'MORNING' | 'AFTERNOON', pointIds: string[]) => void;
}

type OpenSheet =
  | { kind: 'route' }
  | { kind: 'addPoint' }
  | { kind: 'editPoint'; id: string }
  | { kind: 'deletePoint'; id: string }
  | { kind: 'deleteRoute' }
  | null;

const DIRECTIONS = [
  { value: 'MORNING' as const, label: '上午順序' },
  { value: 'AFTERNOON' as const, label: '下午順序' },
];

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
  const [sheet, setSheet] = useState<OpenSheet>(null);

  const ordered = sortedFor(route.points, direction);
  const ids = ordered.map((p) => p.id);
  const editing = sheet?.kind === 'editPoint' ? route.points.find((p) => p.id === sheet.id) : null;
  const deleting =
    sheet?.kind === 'deletePoint' ? route.points.find((p) => p.id === sheet.id) : null;
  const close = (): void => setSheet(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" block={false} onClick={() => setSheet({ kind: 'route' })}>
          <Icon name="cog" className="h-4 w-4" />
          路線設定
        </Button>
        <Button variant="secondary" block={false} onClick={() => setSheet({ kind: 'addPoint' })}>
          新增接送點
        </Button>
      </div>

      <div>
        <p className="mb-2 text-2xs font-semibold text-ink-mute">接送點（{route.points.length}）</p>
        <Segmented
          label="要排哪一個方向的順序"
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
        />
      </div>

      {direction === 'AFTERNOON' && (
        <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
          <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
          {route.afternoonCustomOrder
            ? '下午順序已經自己排過，之後新增接送點不會再自動重排。'
            : '下午預設是上午倒過來（原路開回去）。在這裡調整過之後，下午就走自己的順序。'}
        </p>
      )}

      {ordered.length === 0 ? (
        <EmptyState
          title="這條路線還沒有接送點"
          hint="娃娃車是開到孩子家門口，所以先把每一戶加進來"
          action={
            <Button variant="secondary" block={false} onClick={() => setSheet({ kind: 'addPoint' })}>
              新增第一個接送點
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col">
          {ordered.map((point, index) => (
            <li key={point.id} className="border-b border-line py-3 last:border-b-0">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md2 bg-surface-sunk text-sm font-bold tabular-nums text-ink-soft"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-ink">{point.name}</p>
                  <p className="truncate text-2xs text-ink-soft">
                    {point.address || '未填地址'}
                    {' · '}
                    上午 {point.etaAm || '—'} / 下午 {point.etaPm || '—'}
                  </p>
                  <p className="truncate text-2xs text-ink-mute">
                    {/* 「還沒有人」不是錯誤，是提示下一步：去學生那頁把孩子掛上來。 */}
                    載：{(ridersByPoint.get(point.id) ?? []).join('、') || '還沒有人'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSheet({ kind: 'editPoint', id: point.id })}
                  className="tappable min-h-touch shrink-0 rounded-md2 border border-line-strong px-3 text-2xs font-semibold text-ink"
                >
                  編輯
                </button>
              </div>

              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  aria-label={`${point.name} 往上`}
                  disabled={busy || index === 0}
                  onClick={() => onMovePoint(direction, move(ids, index, -1))}
                  className="tappable flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink-soft disabled:opacity-30"
                >
                  <Icon name="chev" className="h-4 w-4 -rotate-90" />
                </button>
                <button
                  type="button"
                  aria-label={`${point.name} 往下`}
                  disabled={busy || index === ordered.length - 1}
                  onClick={() => onMovePoint(direction, move(ids, index, 1))}
                  className="tappable flex h-11 w-11 items-center justify-center rounded-full border border-line-strong text-ink-soft disabled:opacity-30"
                >
                  <Icon name="chev" className="h-4 w-4 rotate-90" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <p className="min-w-0 flex-1 text-2xs text-ink-soft">
          目前有 {assignedCount} 個孩子搭這條路線。
        </p>
        <Button
          variant="danger"
          block={false}
          disabled={busy}
          onClick={() => setSheet({ kind: 'deleteRoute' })}
        >
          刪除路線
        </Button>
      </div>

      {sheet?.kind === 'route' && (
        <RouteSettingsSheet
          key={route.id}
          route={route}
          staff={staff}
          busy={busy}
          onClose={close}
          onSave={(patch) => {
            onUpdateRoute(patch);
            close();
          }}
        />
      )}

      <PointSheet
        open={sheet?.kind === 'addPoint'}
        title="新增接送點"
        submitLabel="新增"
        busy={busy}
        onClose={close}
        onSubmit={(values) => {
          onAddPoint({ name: values.name, address: values.address });
          close();
        }}
      />

      {editing && (
        <PointSheet
          key={editing.id}
          open
          title={`編輯 ${editing.name}`}
          submitLabel="儲存"
          busy={busy}
          initial={editing}
          onClose={close}
          onSubmit={(values) => {
            onUpdatePoint(editing.id, values);
            close();
          }}
          onDelete={() => setSheet({ kind: 'deletePoint', id: editing.id })}
        />
      )}

      {/* 刪除都要先問一次，而且要講清楚會連帶消失什麼。 */}
      {deleting && (
        <Sheet open title={`刪除 ${deleting.name}？`} onClose={close}>
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink">
              這一站會從上午與下午的順序裡消失。原本在這裡上下車的孩子會變成「尚未指定接送點」，
              要到學生那一頁重新指定。
            </p>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                onDeletePoint(deleting.id);
                close();
              }}
            >
              確定刪除這個接送點
            </Button>
          </div>
        </Sheet>
      )}

      {sheet?.kind === 'deleteRoute' && (
        <Sheet open title={`刪除 ${route.name}？`} onClose={close}>
          <div className="flex flex-col gap-4">
            <p className="text-sm leading-relaxed text-ink">
              這條路線的 {route.points.length} 個接送點會一起消失，
              目前搭這條路線的 {assignedCount} 個孩子會變成不搭娃娃車。
              已經發生的乘車紀錄不受影響。
            </p>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                onDeleteRoute();
                close();
              }}
            >
              確定刪除這條路線
            </Button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

// 路線本身的設定。填完按一顆「儲存」——舊版是失焦就存，沒有任何存好了的訊號。
function RouteSettingsSheet({
  route,
  staff,
  busy,
  onClose,
  onSave,
}: {
  route: BusRouteView;
  staff: StaffOption[];
  busy: boolean;
  onClose: () => void;
  onSave: (patch: Partial<SaveBusRouteBody>) => void;
}) {
  const [name, setName] = useState(route.name);
  const [busTeacherId, setBusTeacherId] = useState(route.busTeacherId ?? '');
  const [morningDepart, setMorningDepart] = useState(route.morningDepart ?? '');
  const [afternoonDepart, setAfternoonDepart] = useState(route.afternoonDepart ?? '');
  const [isActive, setIsActive] = useState(route.isActive);
  const [error, setError] = useState<string | null>(null);

  return (
    <Sheet open title={`${route.name} 的設定`} onClose={onClose}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError('請填路線名稱。');
            return;
          }
          onSave({
            name: name.trim(),
            busTeacherId: busTeacherId || null,
            morningDepart: morningDepart || null,
            afternoonDepart: afternoonDepart || null,
            isActive,
          });
        }}
        className="flex flex-col gap-4"
      >
        <Field label="路線名稱" error={error ?? undefined}>
          <input
            type="text"
            value={name}
            maxLength={40}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            className="field"
          />
        </Field>

        {/* 老師人數通常不只三個，維持原生下拉。 */}
        <Field label="隨車老師" hint="只列得出在職、且帶老師或隨車老師身分的人">
          <select
            aria-label="隨車老師"
            value={busTeacherId}
            onChange={(e) => setBusTeacherId(e.target.value)}
            className="field"
          >
            <option value="">尚未指派</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="上午發車">
            <input
              type="time"
              value={morningDepart}
              onChange={(e) => setMorningDepart(e.target.value)}
              className="field tabular-nums"
            />
          </Field>
          <Field label="下午發車">
            <input
              type="time"
              value={afternoonDepart}
              onChange={(e) => setAfternoonDepart(e.target.value)}
              className="field tabular-nums"
            />
          </Field>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label="啟用這條路線"
          onClick={() => setIsActive((v) => !v)}
          className="tappable flex min-h-touch w-full items-center gap-3 rounded-md2 border border-line-strong bg-surface px-4 py-3 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold text-ink">啟用這條路線</span>
            <span className="mt-0.5 block text-2xs text-ink-soft">
              停用之後不會出現在點名裡，設定與名單都留著。
            </span>
          </span>
          <span
            aria-hidden
            className={`relative block h-6 w-11 shrink-0 rounded-full border transition ${
              isActive ? 'border-transparent bg-brand-primary' : 'border-line bg-surface-sunk'
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full shadow-soft transition-all ${
                isActive ? 'left-6 bg-white' : 'left-0.5 bg-ink-mute'
              }`}
            />
          </span>
        </button>

        <Button type="submit" variant="primary" disabled={busy}>
          儲存
        </Button>
      </form>
    </Sheet>
  );
}

interface PointValues {
  name: string;
  address: string | null;
  etaAm: string | null;
  etaPm: string | null;
}

// 新增與編輯接送點共用同一份表單 —— 兩邊各做一套，遲早會有一邊的改動漏掉。
function PointSheet({
  open,
  title,
  submitLabel,
  busy,
  initial,
  onClose,
  onSubmit,
  onDelete,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  busy: boolean;
  initial?: BusPointView;
  onClose: () => void;
  onSubmit: (values: PointValues) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [etaAm, setEtaAm] = useState(initial?.etaAm ?? '');
  const [etaPm, setEtaPm] = useState(initial?.etaPm ?? '');
  const [error, setError] = useState<string | null>(null);

  return (
    <Sheet open={open} title={title} onClose={onClose}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError('請填接送點名稱，通常就是那一戶人家。');
            return;
          }
          onSubmit({
            name: name.trim(),
            address: address.trim() || null,
            etaAm: etaAm || null,
            etaPm: etaPm || null,
          });
          if (!initial) {
            setName('');
            setAddress('');
            setEtaAm('');
            setEtaPm('');
          }
        }}
        className="flex flex-col gap-4"
      >
        <Field label="名稱" hint="一戶人家一個點，兄弟姊妹共用同一個" error={error ?? undefined}>
          <input
            type="text"
            value={name}
            maxLength={40}
            placeholder="例如：陳家"
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            className="field"
          />
        </Field>

        <Field label="地址（選填）">
          <input
            type="text"
            value={address}
            maxLength={120}
            onChange={(e) => setAddress(e.target.value)}
            className="field"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="上午預計時間">
            <input
              type="time"
              value={etaAm}
              onChange={(e) => setEtaAm(e.target.value)}
              className="field tabular-nums"
            />
          </Field>
          <Field label="下午預計時間">
            <input
              type="time"
              value={etaPm}
              onChange={(e) => setEtaPm(e.target.value)}
              className="field tabular-nums"
            />
          </Field>
        </div>

        <Button type="submit" variant="primary" disabled={busy}>
          {submitLabel}
        </Button>

        {onDelete && (
          <Button variant="danger" disabled={busy} onClick={onDelete}>
            刪除這個接送點
          </Button>
        )}
      </form>
    </Sheet>
  );
}
