import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface TermCellProps {
  termId: string;
  lang: string;
  initialValue: string;
  isLocked: boolean;
  status?: 'draft' | 'ai_translated' | 'reviewed' | 'approved';
  source?: 'human' | 'ai' | 'tm';
  maxChars?: number | null;
  onSave: (termId: string, lang: string, text: string) => void;
  onFocus?: (termId: string, lang: string) => void;
}

/**
 * Isolated Atomic Cell Component (TASK-604)
 * Guarantees zero re-render of sibling cells/rows while typing.
 * Debounces auto-save at 1500ms, immediately commits onBlur.
 */
export const TermCell = React.memo<TermCellProps>(
  ({
    termId,
    lang,
    initialValue,
    isLocked,
    status = 'draft',
    source = 'human',
    maxChars,
    onSave,
    onFocus,
  }) => {
    const [value, setValue] = useState(initialValue);
    const [isDirty, setIsDirty] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const currentValueRef = useRef(value);
    currentValueRef.current = value;

    // Synchronize if server value changes externally
    useEffect(() => {
      setValue(initialValue);
      setIsDirty(false);
    }, [initialValue]);

    // Cleanup timer on unmount
    useEffect(() => {
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }, []);

    const commitSave = useCallback(
      (valToSave: string) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (valToSave !== initialValue) {
          onSave(termId, lang, valToSave);
          setIsDirty(false);
        }
      },
      [termId, lang, initialValue, onSave]
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const nextVal = e.target.value;
      setValue(nextVal);
      setIsDirty(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        commitSave(nextVal);
      }, 1500);
    };

    const handleBlur = () => {
      commitSave(currentValueRef.current);
    };

    const isOverflow = Boolean(maxChars && value.length > maxChars);

    return (
      <div
        className={`relative flex items-center h-full px-2 py-1 text-xs transition-colors duration-150 border-r border-slate-200/50 dark:border-slate-800/60 ${
          isDirty ? 'bg-amber-500/5 dark:bg-amber-400/5' : ''
        } ${isOverflow ? 'bg-rose-500/10' : ''}`}
        data-testid={`cell-${termId}-${lang}`}
      >
        <input
          type="text"
          value={value}
          disabled={isLocked}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={() => onFocus?.(termId, lang)}
          className={`w-full bg-transparent font-sans text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 ${
            isOverflow
              ? 'focus:ring-rose-500 text-rose-600 dark:text-rose-400 font-semibold'
              : 'focus:ring-primary-500'
          } rounded px-1 py-0.5 disabled:opacity-60 disabled:cursor-not-allowed`}
          placeholder={`输入 ${lang} 译文...`}
        />

        {/* Source Badge Pill */}
        {source === 'ai' && (
          <span
            title="AI 翻译建议"
            className="absolute right-1 bottom-1 text-[9px] px-1 py-0.2 rounded bg-accent-500/15 text-accent-600 dark:text-accent-400 font-mono scale-90"
          >
            AI
          </span>
        )}
        {source === 'tm' && (
          <span
            title="TM 记忆库匹配"
            className="absolute right-1 bottom-1 text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono scale-90"
          >
            TM
          </span>
        )}
        {isDirty && (
          <span
            title="未保存变更"
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
          />
        )}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.initialValue === next.initialValue &&
      prev.isLocked === next.isLocked &&
      prev.status === next.status &&
      prev.source === next.source &&
      prev.maxChars === next.maxChars
    );
  }
);

TermCell.displayName = 'TermCell';
