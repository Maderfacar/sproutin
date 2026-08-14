import { SetMetadata } from '@nestjs/common';

// 目前支援的資料列級 scope 資源類型（Step 3 骨架先做 student，核心聚合根）。
export type ScopeResource = 'student';

export interface ScopeMeta {
  resource: ScopeResource;
  // 從 request params 取資源 id 的欄位名（預設 'id'）。
  param: string;
}

// @Scope('student')：宣告此端點需資料列級授權（老師自班 / 家長自己小孩）。
// ScopeGuard 讀此 metadata → 解析目標資源 → 檢查是否屬於呼叫者。
export const SCOPE_KEY = 'scope';
export const Scope = (resource: ScopeResource, param = 'id') =>
  SetMetadata<string, ScopeMeta>(SCOPE_KEY, { resource, param });
