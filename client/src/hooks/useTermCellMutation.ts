import { useMutation, useQueryClient } from '@tanstack/react-query';
import { termsApi } from '../api/terms-api';
import { TermItem } from './useTermsQuery';

export interface UpdateTranslationVariables {
  termId: string;
  lang: string;
  text: string;
}

export function useTermCellMutation(
  onLocalUpdate?: (termId: string, lang: string, text: string) => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ termId, lang, text }: UpdateTranslationVariables) => {
      // If mock mode or API fails, we still commit locally
      try {
        return await termsApi.updateTranslation(termId, lang, text);
      } catch (err) {
        // Fallback for offline/mock development
        return { success: true, termId, lang, text };
      }
    },
    onMutate: async ({ termId, lang, text }) => {
      // 1. Cancel outgoing queries for terms
      await queryClient.cancelQueries({ queryKey: ['terms'] });

      // 2. Snapshot previous value
      const previousTerms = queryClient.getQueryData<TermItem[]>(['terms']);

      // 3. Optimistically update local UI state callback
      if (onLocalUpdate) {
        onLocalUpdate(termId, lang, text);
      }

      // 4. Optimistically update TanStack Query cache if present
      if (previousTerms) {
        queryClient.setQueryData<TermItem[]>(['terms'], (old) => {
          if (!old) return [];
          return old.map((item) => {
            if (item.id !== termId) return item;
            return {
              ...item,
              translations: {
                ...item.translations,
                [lang]: {
                  ...(item.translations[lang] || { lang }),
                  text,
                  status: 'reviewed',
                  source: 'human',
                  updatedAt: new Date().toISOString(),
                },
              },
            };
          });
        });
      }

      return { previousTerms };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousTerms) {
        queryClient.setQueryData(['terms'], context.previousTerms);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
  });
}
