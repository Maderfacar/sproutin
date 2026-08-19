'use client';

import { Icon } from '../../components/Icon';
import { apiErrorMessage } from '../../lib/api';
import type { BusRideView, MyBusView } from '../../lib/types';
import { formatTime, schoolHour } from '../../lib/datetime';
import { useMyBus } from './hooks';
import { EmptyState, ErrorNotice, SkeletonCards, StateCard } from '../../components/ui';
import type { Tone } from '../../components/ui';

// 家長看今日狀態。刻意只有一個大狀態 + 一條時間軸：
// 不做地圖、不做「車開到哪」——沒有即時 GPS（Human Owner 定案），
// 與其做一個看起來像即時追蹤其實不是的東西，不如老實說我們知道什麼。
//
// 「接下來那一趟」用狀態卡（整頁只有這一張，遠看顏色就知道結果）；
// 已經過去的那一趟收成一塊安靜的區塊 —— 家長早上想知道的是上學，下午想知道的是放學。

function hhmm(iso: string | null): string {
  return iso ? formatTime(iso) : '';
}

function headline(ride: BusRideView | null, rides: boolean): string {
  if (!rides) return '今天沒有這一趟';
  if (!ride || ride.status === 'SCHEDULED') return '還沒上車';
  switch (ride.status) {
    case 'BOARDED':
      return `已上車 ${hhmm(ride.boardedAt)}`;
    case 'ALIGHTED':
      return `已下車 ${hhmm(ride.alightedAt)}`;
    default:
      return '今日未搭';
  }
}

function toneOf(ride: BusRideView | null, rides: boolean): Tone {
  if (!rides) return 'neutral';
  if (!ride || ride.status === 'SCHEDULED') return 'wait';
  if (ride.status === 'ABSENT') return 'stop';
  return 'good';
}

interface SegmentProps {
  title: string;
  depart: string | null;
  pointName: string | null;
  rides: boolean;
  ride: BusRideView | null;
  boardLabel: string;
  alightLabel: string;
  /** 接下來那一趟。整頁只有一段是 true。 */
  emphasis: boolean;
}

function Steps({
  ride,
  rides,
  boardLabel,
  alightLabel,
  pointName,
}: Pick<SegmentProps, 'ride' | 'rides' | 'boardLabel' | 'alightLabel' | 'pointName'>) {
  if (!rides) return null;
  const done = (step: 'board' | 'alight'): boolean =>
    step === 'board'
      ? ride?.status === 'BOARDED' || ride?.status === 'ALIGHTED'
      : ride?.status === 'ALIGHTED';

  return (
    <ul className="border-t border-hairline pt-2 text-sm">
      <li className="flex items-center gap-3 py-1.5">
        <Icon name={done('board') ? 'check' : 'chev'} className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1">
          {boardLabel}
          {pointName ? `（${pointName}）` : ''}
        </span>
        <span className="text-2xs tabular-nums opacity-70">
          {done('board') ? hhmm(ride!.boardedAt) : '等待中'}
        </span>
      </li>
      <li className="flex items-center gap-3 py-1.5">
        <Icon name={done('alight') ? 'check' : 'chev'} className="h-4 w-4 shrink-0 opacity-70" />
        <span className="flex-1">{alightLabel}</span>
        <span className="text-2xs tabular-nums opacity-70">
          {done('alight') ? hhmm(ride!.alightedAt) : '等待中'}
        </span>
      </li>
    </ul>
  );
}

function Segment({
  title,
  depart,
  pointName,
  rides,
  ride,
  boardLabel,
  alightLabel,
  emphasis,
}: SegmentProps) {
  const steps = (
    <Steps
      ride={ride}
      rides={rides}
      boardLabel={boardLabel}
      alightLabel={alightLabel}
      pointName={pointName}
    />
  );

  if (emphasis) {
    return (
      <StateCard
        eyebrow={depart ? `${title} · ${depart} 出發` : title}
        headline={headline(ride, rides)}
        tone={toneOf(ride, rides)}
      >
        {steps}
      </StateCard>
    );
  }

  // 已經過去的那一趟：同樣的內容，安靜一階。
  return (
    <section className="rounded-card border border-line bg-surface p-4 text-ink-soft">
      <p className="text-2xs font-semibold text-ink-mute">
        {depart ? `${title} · ${depart} 出發` : title}
      </p>
      <p className="mt-0.5 font-serif text-xl font-bold text-ink">{headline(ride, rides)}</p>
      {steps}
    </section>
  );
}

export function BusTodayCard({ studentId }: { studentId: string | undefined }) {
  const { data, isLoading, isError, error, refetch } = useMyBus(studentId);

  if (isLoading) return <SkeletonCards cards={1} />;
  if (isError) {
    return <ErrorNotice message={apiErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (!data) return null;

  if (!data.routeName) {
    return (
      <EmptyState
        title="這個孩子目前沒有搭娃娃車"
        hint="需要搭車或調整接送點，請聯絡園所"
      />
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
      <p className="text-2xs font-semibold text-ink-mute">{view.routeName}</p>
      {afternoonFirst ? [afternoon, morning] : [morning, afternoon]}

      <p className="flex items-start gap-2 text-2xs leading-relaxed text-ink-soft">
        <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0" />
        接送點由園所安排，需要變更請聯絡園所。這裡顯示的是隨車老師實際點下的紀錄，不是即時車輛位置。
      </p>
    </div>
  );
}
