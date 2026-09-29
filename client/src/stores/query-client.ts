import { QueryClient } from '@tanstack/react-query';

/**
 * Enterprise QueryClient for GlossaHub
 * Implements resilient caching, deduplication, and offline-aware retries
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute fresh window
      gcTime: 1000 * 60 * 10, // 10 minutes cache persistence
      retry: (failureCount, error: any) => {
        // Do not retry 4xx client errors (e.g. 403 sealed version, 404 not found)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Idempotent network retry for 5xx, but not 4xx client invariants
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

export const QUERY_KEYS = {
  terms: (versionId?: string, filter?: any) => ['terms', versionId, filter] as const,
  termDetail: (termId: string) => ['term', termId] as const,
  versions: (projectId?: string) => ['versions', projectId] as const,
  projects: () => ['projects'] as const,
  auditHistory: (termId: string) => ['audit-history', termId] as const,
  diffComparison: (sourceVersionId: string, targetVersionId: string) => 
    ['diff', sourceVersionId, targetVersionId] as const,
};
