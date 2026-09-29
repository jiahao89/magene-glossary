import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '../stores/query-client';

export interface TermTranslationItem {
  id?: string;
  lang: string;
  text: string;
  status: 'draft' | 'ai_translated' | 'reviewed' | 'approved';
  source: 'human' | 'ai' | 'tm';
  updatedAt?: string;
}

export interface TermItem {
  id: string;
  projectId: string;
  versionId: string;
  kw: string;
  zhCn: string;
  comment?: string | null;
  maxChars?: number | null;
  isLocked: boolean;
  status: 'active' | 'deprecated';
  createdAt: string;
  updatedAt: string;
  translations: Record<string, TermTranslationItem>;
  meta?: {
    module?: string;
    hasOverflowWarning?: boolean;
  };
}

export interface TermListResponse {
  total: number;
  items: TermItem[];
}

export interface SaveTranslationParams {
  termId: string;
  lang: string;
  text: string;
  source?: 'human' | 'ai' | 'tm';
  versionId?: string;
}

/**
 * Fetch terms with caching & pagination/filtering
 */
export function useTermsQuery(versionId?: string, filter?: any) {
  return useQuery({
    queryKey: QUERY_KEYS.terms(versionId, filter),
    queryFn: async (): Promise<TermListResponse> => {
      const params = new URLSearchParams();
      if (versionId) params.set('versionId', versionId);
      if (filter?.kw) params.set('kw', filter.kw);
      if (filter?.module) params.set('module', filter.module);

      const res = await fetch(`/api/v2/terms?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch terms: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: Boolean(versionId || filter),
  });
}

/**
 * Mutation for updating term translation with optimistic local cache update
 * Defends against white flashes & full grid re-renders
 */
export function useSaveTranslationMutation(versionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ termId, lang, text, source = 'human' }: SaveTranslationParams) => {
      const res = await fetch(`/api/v2/terms/${termId}/translations/${lang}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, source }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.title || `Save failed: ${res.status}`);
      }
      return res.json();
    },
    // Optimistic update
    onMutate: async ({ termId, lang, text, source = 'human' }) => {
      const queryKey = QUERY_KEYS.terms(versionId);
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<TermListResponse>(queryKey);

      if (previousData) {
        queryClient.setQueryData<TermListResponse>(queryKey, {
          ...previousData,
          items: previousData.items.map((term) => {
            if (term.id !== termId) return term;
            return {
              ...term,
              translations: {
                ...term.translations,
                [lang]: {
                  ...(term.translations[lang] || {
                    lang,
                    status: 'draft',
                  }),
                  text,
                  source,
                  updatedAt: new Date().toISOString(),
                },
              },
            };
          }),
        });
      }

      return { previousData, queryKey };
    },
    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    // Silent invalidation without full refetch flash
    onSettled: (_data, _err, _variables, context) => {
      if (context?.queryKey) {
        // Invalidate softly in background
        queryClient.invalidateQueries({
          queryKey: context.queryKey,
          refetchType: 'none', // Do not force loading spinner
        });
      }
    },
  });
}

/**
 * Toggle term lock mutation
 */
export function useToggleLockMutation(versionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ termId, isLocked }: { termId: string; isLocked: boolean }) => {
      const res = await fetch(`/api/v2/terms/${termId}/lock`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLocked }),
      });
      if (!res.ok) {
        throw new Error(`Lock toggle failed: ${res.status}`);
      }
      return res.json();
    },
    onMutate: async ({ termId, isLocked }) => {
      const queryKey = QUERY_KEYS.terms(versionId);
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<TermListResponse>(queryKey);
      if (previousData) {
        queryClient.setQueryData<TermListResponse>(queryKey, {
          ...previousData,
          items: previousData.items.map((item) =>
            item.id === termId ? { ...item, isLocked } : item
          ),
        });
      }
      return { previousData, queryKey };
    },
    onError: (_err, _var, context) => {
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
  });
}
