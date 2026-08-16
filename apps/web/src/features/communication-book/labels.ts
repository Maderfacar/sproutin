import type {
  HealthSymptom,
  MealAmount,
  Mood,
  NapQuality,
  PickupMethod,
  ToiletState,
} from '../../lib/types';

// 每日聯絡簿的中文標籤與選項順序（由「最順利」到「最需注意」）。
// 直欄模式的「一鍵套用今日順利」即取每個選項清單的第一項。

export const MEAL_OPTIONS: readonly MealAmount[] = ['ALL', 'MOST', 'HALF', 'LITTLE', 'NONE'];
export const NAP_OPTIONS: readonly NapQuality[] = ['WELL', 'SHORT', 'NONE'];
export const TOILET_OPTIONS: readonly ToiletState[] = ['NORMAL', 'LOOSE', 'HARD', 'NONE'];
export const MOOD_OPTIONS: readonly Mood[] = ['HAPPY', 'CALM', 'SLEEPY', 'LOW'];
export const PICKUP_OPTIONS: readonly PickupMethod[] = ['FAMILY', 'SCHOOL_BUS'];
export const SYMPTOM_OPTIONS: readonly HealthSymptom[] = [
  'COUGH',
  'RUNNY_NOSE',
  'SORE_THROAT',
  'DIARRHEA',
  'VOMITING',
  'POOR_APPETITE',
  'LOW_ENERGY',
  'RASH',
];

export const MEAL_LABEL: Record<MealAmount, string> = {
  ALL: '吃完',
  MOST: '大部分',
  HALF: '一半',
  LITTLE: '少許',
  NONE: '沒吃',
};

export const NAP_LABEL: Record<NapQuality, string> = {
  WELL: '睡得好',
  SHORT: '睡一下下',
  NONE: '沒睡',
};

export const TOILET_LABEL: Record<ToiletState, string> = {
  NORMAL: '正常',
  LOOSE: '軟便',
  HARD: '硬便',
  NONE: '今天沒有',
};

export const MOOD_LABEL: Record<Mood, string> = {
  HAPPY: '開心',
  CALM: '平穩',
  SLEEPY: '想睡',
  LOW: '情緒低落',
};

export const PICKUP_LABEL: Record<PickupMethod, string> = {
  FAMILY: '家人接送',
  SCHOOL_BUS: '校車',
};

export const SYMPTOM_LABEL: Record<HealthSymptom, string> = {
  COUGH: '咳嗽',
  RUNNY_NOSE: '流鼻水',
  SORE_THROAT: '喉嚨不適',
  DIARRHEA: '腹瀉',
  VOMITING: '嘔吐',
  POOR_APPETITE: '食慾不振',
  LOW_ENERGY: '精神不濟',
  RASH: '皮膚疹',
};

// 老師留言的常用短語：打字是整個流程最慢的一環，一點就帶入。
export const NOTE_PHRASES: readonly string[] = [
  '今天很棒，主動幫忙整理',
  '今天玩得很開心',
  '衣物需補充',
  '今天有點想家',
  '已多補充水分',
  '已安排休息',
];
