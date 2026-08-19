import { describe, it, expect } from 'vitest';
import type { AuthUser } from '@sproutin/shared';
import { availablePersonas, defaultPersona, isPersona, resolvePersona } from './persona';

const r = (...roles: AuthUser['roles'][number]['role'][]): AuthUser['roles'] =>
  roles.map((role) => ({ role, scopeType: 'SCHOOL' as const, scopeId: null }));

describe('availablePersonas', () => {
  it('純家長只有家長身分 → 不該出現切換器', () => {
    expect(availablePersonas(r('PARENT'))).toEqual(['parent']);
    expect(availablePersonas(r('GUARDIAN'))).toEqual(['parent']);
  });

  it('純老師只有老師身分', () => {
    expect(availablePersonas(r('TEACHER'))).toEqual(['teacher']);
  });

  it('園長與行政都落在 staff（全園的數字與名單是同一件事）', () => {
    expect(availablePersonas(r('OWNER'))).toEqual(['staff']);
    expect(availablePersonas(r('ADMIN'))).toEqual(['staff']);
  });

  // 園長兼導師是兩件事：全園今天到幾個 vs 我這班誰還沒點名。
  it('園長兼導師 → 兩個身分都在，園長排前面', () => {
    expect(availablePersonas(r('OWNER', 'TEACHER'))).toEqual(['staff', 'teacher']);
  });

  it('老師的小孩也在園裡 → 老師與家長都有，工作身分排前面', () => {
    expect(availablePersonas(r('TEACHER', 'PARENT'))).toEqual(['teacher', 'parent']);
  });

  // 隨車老師只有在沒有其他校方身分時才單獨成立 —— 園長兼隨車的人在自己的殼裡就點得到，
  // 多給他一個「只能點名」的殼只是噪音。
  it('純隨車老師 → bus；園長兼隨車 → 只有 staff', () => {
    expect(availablePersonas(r('BUS_TEACHER'))).toEqual(['bus']);
    expect(availablePersonas(r('OWNER', 'BUS_TEACHER'))).toEqual(['staff']);
  });

  it('沒有任何角色 → 空清單', () => {
    expect(availablePersonas([])).toEqual([]);
  });
});

describe('defaultPersona', () => {
  it('取清單第一個（已依上班優先排序）', () => {
    expect(defaultPersona(['teacher', 'parent'])).toBe('teacher');
  });

  // 停用或資料異常的帳號可能一個身分都沒有。落在 parent —— 那是唯一不顯示任何管理功能的殼。
  it('清單是空的 → 落在最安全的家長殼', () => {
    expect(defaultPersona([])).toBe('parent');
  });
});

describe('resolvePersona', () => {
  it('記住的身分還有效 → 沿用', () => {
    expect(resolvePersona(['teacher', 'parent'], 'parent')).toBe('parent');
  });

  it('沒記過 → 用預設', () => {
    expect(resolvePersona(['staff', 'teacher'], null)).toBe('staff');
  });

  // 這一條是真正的重點：角色被拔掉之後還停在舊身分，
  // 使用者會卡在一個點什麼都 403 的殼裡。
  it('記住的身分已經失去角色 → 退回預設，不留在死殼裡', () => {
    expect(resolvePersona(['parent'], 'teacher')).toBe('parent');
  });

  it('localStorage 被塞了不認識的值 → 當作沒記過', () => {
    expect(resolvePersona(['teacher'], '園長大人')).toBe('teacher');
  });
});

describe('isPersona', () => {
  it('只認四種身分', () => {
    expect(isPersona('parent')).toBe(true);
    expect(isPersona('teacher')).toBe(true);
    expect(isPersona('staff')).toBe(true);
    expect(isPersona('bus')).toBe(true);
    expect(isPersona('owner')).toBe(false);
    expect(isPersona('')).toBe(false);
  });
});
