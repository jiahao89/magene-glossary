import { apiClient } from './client';
import { VersionDiffItem } from '../pages/VersionDiffPage';

export interface CompareVersionsRequest {
  projectId: string;
  sourceVersion: string;
  targetVersion: string;
  cleanFalseDiffs?: boolean;
}

export interface ApplyDiffRequest {
  projectId: string;
  targetVersion: string;
  selectedDiffIds: string[];
}

export const diffApi = {
  async compareVersions(req: CompareVersionsRequest): Promise<{
    diffs: VersionDiffItem[];
    summary: { addCount: number; delCount: number; modCount: number; falseDiffCleaned: number };
  }> {
    return apiClient('/diff/compare', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async applyDiff(req: ApplyDiffRequest): Promise<{ success: boolean; mergedCount: number }> {
    return apiClient('/diff/apply', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
};
