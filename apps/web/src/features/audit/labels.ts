import type { AuditResult } from '../../lib/types';

export const AUDIT_RESULT_LABEL: Record<AuditResult, { label: string; className: string }> = {
  SUCCESS: { label: '成功', className: 'bg-green-100 text-green-800' },
  FAILURE: { label: '失敗', className: 'bg-red-100 text-red-800' },
  DENIED: { label: '拒絕', className: 'bg-amber-100 text-amber-800' },
};

// 常見資源類型（稽核篩選下拉;空 = 全部）。其他類型仍會出現在結果中。
export const AUDIT_RESOURCE_TYPES = ['Leave', 'Student', 'Message', 'Announcement', 'AuditLog'];
