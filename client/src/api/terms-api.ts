import { apiClient } from './client';
import { TermItem } from '../hooks/useTermsQuery';

export interface GetTermsParams {
  projectId?: string;
  versionId?: string;
  search?: string;
  module?: string;
}

export const termsApi = {
  async getTerms(params: GetTermsParams = {}): Promise<TermItem[]> {
    const query = new URLSearchParams();
    if (params.projectId) query.append('projectId', params.projectId);
    if (params.versionId) query.append('versionId', params.versionId);
    if (params.search) query.append('search', params.search);
    if (params.module && params.module !== 'all') query.append('module', params.module);

    const queryString = query.toString();
    return apiClient<TermItem[]>(`/terms${queryString ? `?${queryString}` : ''}`);
  },

  async updateTranslation(
    termId: string,
    lang: string,
    text: string
  ): Promise<{ success: boolean; termId: string; lang: string; text: string }> {
    return apiClient<{ success: boolean; termId: string; lang: string; text: string }>(
      `/terms/${termId}/translations/${lang}`,
      {
        method: 'PUT',
        body: JSON.stringify({ text }),
      }
    );
  },

  async toggleLock(termId: string, isLocked: boolean): Promise<{ success: boolean; isLocked: boolean }> {
    return apiClient<{ success: boolean; isLocked: boolean }>(`/terms/${termId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ isLocked }),
    });
  },

  async createTerm(data: Partial<TermItem>): Promise<TermItem> {
    return apiClient<TermItem>('/terms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteTerm(termId: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/terms/${termId}`, {
      method: 'DELETE',
    });
  },

  async batchAITranslate(termIds: string[], targetLangs: string[]): Promise<{ count: number; terms: TermItem[] }> {
    return apiClient<{ count: number; terms: TermItem[] }>('/ai/batch-translate', {
      method: 'POST',
      body: JSON.stringify({ termIds, targetLangs }),
    });
  },
};
