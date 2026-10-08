import { apiClient } from './client';
import { AuditLogEntry } from '../data/mock-data';

export const auditApi = {
  async getAuditLogs(params: { kw?: string; operator?: string; limit?: number } = {}): Promise<AuditLogEntry[]> {
    const query = new URLSearchParams();
    if (params.kw) query.append('kw', params.kw);
    if (params.operator && params.operator !== 'all') query.append('operator', params.operator);
    if (params.limit) query.append('limit', String(params.limit));

    const queryString = query.toString();
    return apiClient<AuditLogEntry[]>(`/audit/logs${queryString ? `?${queryString}` : ''}`);
  },

  async rollbackSnapshot(snapshotId: string): Promise<{ success: boolean; backupSnapshotId: string }> {
    return apiClient('/audit/rollback', {
      method: 'POST',
      body: JSON.stringify({ snapshotId }),
    });
  },
};
