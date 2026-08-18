'use client';

import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../lib/api';
import type { BusRideView, MyBusView } from '../../lib/types';
import { formatTime, schoolHour } from '../../lib/datetime';
import { useMyBus } from './hooks';
import { SkeletonCards } from '../../components/Skeleton';

// 家長看今日狀態。刻意只有一個大狀態 + 一條時間軸：
// 不做地圖、不做「車開到哪」——沒有即時 GPS（Human Owner 定案），
// 與其做一個看起來像即時追蹤其實不是的東西，不如老實說我們知道什麼。

function hhmm(iso: string | null): string {
  return iso ? formatTime(iso) : '';
}

function headline(ride: BusRideView | null, rides: boolean): string {
  if (!rides) return '今天沒有這一趟';
  if (!ride || ride.status === 'SCHEDULED') return '尚未開始';
  switch (ride.status) {
    case 'BOARDED':
      return `已上車 ${hhmm(ride.boardedAt)}`;
    case 'ALIGHTED':
      return `已下車 ${hhmm(ride.alightedAt)}`;
    default:
      return '今日未搭';
  }
}

interface SegmentProps {
  title: string;
  depart: string | null;
  pointName: string | null;
  rides: boolean;
  ride: BusRideView | null;
  boardLabel: string;
  alightLabel: string;
  emphasis: boolean;
}

function Segment({ title, depart, pointName, rides, ride, boardLabel, alightLabel, emphasis }: SegmentProps) {
  const done = (step: 'board' | 'alight'): boolean =>
    step === 'board'
      ? ride?.status === 'BOARDED' || ride?.status === 'ALIGHTED'
      : ride?.status === 'ALIGHTED';

  return (
    <section className={emphasis ? 'card p-5' : 'card p-5 opacity-90'}>
      <div className="flex items-baseline gap-2">
        <p className="eyebrow">{title}</p>
        {depart && <span className="text-xs text-ink-soft">{depart} 出發</span>}
      </div>
      <p className="mt-1 font-serif text-2xl font-semibold text-ink">
        {headline(ride, rides)}
      </p>

      {rides && (
        <ul className="mt-4 border-t border-line pt-3 text-sm">
          <li className="flex items-center gap-3 py-1.5">
            <Icon
              name={done('board') ? 'check' : 'chev'}
              className={`h-4 w-4 shrink-0 ${done('board') ? 'text-brand-primary' : 'text-ink-soft'}`}
            />
            <span className="flex-1 text-ink">
              {boardLabel}
              {pointName ? `（${pointName}）` : ''}
            </span>
            <span className="text-xs text-ink-soft">
              {done('board') ? hhmm(ride!.boardedAt) : '等待中'}
            </span>
          </li>
          <li className="flex items-center gap-3 py-1.5">
            <Icon
              name={done('alight') ? 'check' : 'chev'}
              className={`h-4 w-4 shrink-0 ${done('alight') ? 'text-brand-primary' : 'text-ink-soft'}`}
            />
            <span className="flex-1 text-ink">{alightLabel}</span>
            <span className="text-xs text-ink-soft">
              {done('alight') ? hhmm(ride!.alightedAt) : '等待中'}
            </span>
          </li>
        </ul>
      )}
    </section>
  );
}

export function BusTodayCard({ studentId }: { studentId: string | undefined }) {
  const { data, isLoading, isError, error } = useMyBus(studentId);

  if (isLoading) return <SkeletonCards cards={1} />;
  if (isError) return <p className="text-sm text-red-700">{apiErrorMessage(error)}</p>;
  if (!data) return null;

  if (!data.routeName) {
    return (
      <section className="card p-6 text-center">
        <p className="text-sm leading-relaxed text-ink">這個孩子目前沒有搭娃娃車。</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          需要搭車或調整接送點，請聯絡園所。
        </p>
      </section>
    );
  }

  const view: MyBusView = data;
  // 中午之前先看上學那一段，之後把放學那段擺前面 —— 家長想看的永遠是「接下來這一趟」。
  const afternoonFirst = schoolHour() >= 12;
  const morning = (
    <Segment
      key="morning"
      title="上學"
      depart={view.morningDepart}
      pointName={view.morningPointName}
      rides={view.ridesMorning}
      ride={view.morning}
      boardLabel="在家門口上車"
      alightLabel="抵達園所下車"
      emphasis={!afternoonFirst}
    />
  );
  const afternoon = (
    <Segment
      key="afternoon"
      title="放學"
      depart={view.afternoonDepart}
      pointName={view.afternoonPointName}
      rides={view.ridesAfternoon}
      ride={view.afternoon}
      boardLabel="在園所上車"
      alightLabel="送到家門口"
      emphasis={afternoonFirst}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-soft">{view.routeName}</p>
      {afternoonFirst ? [afternoon, morning] : [morning, afternoon]}

      <p className="flex items-start gap-2 text-xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        接送點由園所安排，需要變更請聯絡園所。這裡顯示的是隨車老師實際點下的紀錄，不是即時車輛位置。
      </p>
    </div>
  );
}
