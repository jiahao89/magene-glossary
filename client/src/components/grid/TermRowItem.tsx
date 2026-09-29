import React from 'react';
import { TermItem } from '../../hooks/useTermsQuery';
import { TermCell } from './TermCell';

export interface TermRowItemProps {
  term: TermItem;
  languages: string[];
  isSelected: boolean;
  isActive: boolean;
  onToggleSelect: (id: string) => void;
  onToggleLock: (id: string, currentLocked: boolean) => void;
  onRowClick: (id: string, kw: string) => void;
  onSaveCell: (termId: string, lang: string, text: string) => void;
}

/**
 * TermRowItem Component (TASK-603)
 * Implements sticky frozen left columns and memoized per-cell rendering
 */
export const TermRowItem = React.memo<TermRowItemProps>(
  ({
    term,
    languages,
    isSelected,
    isActive,
    onToggleSelect,
    onToggleLock,
    onRowClick,
    onSaveCell,
  }) => {
    return (
      <div
        onClick={() => onRowClick(term.id, term.kw)}
        className={`flex h-11 w-full min-w-max border-b border-slate-200/60 dark:border-slate-800/60 text-xs transition-colors duration-100 ${
          isActive
            ? 'bg-primary-500/10 dark:bg-primary-500/15'
            : isSelected
            ? 'bg-accent-500/8 dark:bg-accent-500/12'
            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
        }`}
        data-testid={`term-row-${term.id}`}
      >
        {/* Sticky Left Column 1: Checkbox */}
        <div className="sticky left-0 z-10 flex items-center justify-center w-12 h-full bg-inherit border-r border-slate-200/60 dark:border-slate-800/60">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(term.id);
            }}
            className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-0 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
          />
        </div>

        {/* Sticky Left Column 2: Lock Status & Action */}
        <div className="sticky left-12 z-10 flex items-center justify-center w-10 h-full bg-inherit border-r border-slate-200/60 dark:border-slate-800/60">
          <button
            type="button"
            title={term.isLocked ? '已锁定 (点击解锁)' : '未锁定 (点击锁定)'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(term.id, term.isLocked);
            }}
            className={`p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-transform active:scale-90 ${
              term.isLocked ? 'text-amber-500 font-bold' : 'text-slate-400 opacity-40 hover:opacity-100'
            }`}
          >
            {term.isLocked ? '🔒' : '🔓'}
          </button>
        </div>

        {/* Sticky Left Column 3: KW Macro Name */}
        <div
          title={term.kw}
          className="sticky left-22 z-10 flex items-center px-3 w-64 h-full bg-inherit border-r border-slate-200/60 dark:border-slate-800/60 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
        >
          <span className="truncate">{term.kw}</span>
        </div>

        {/* Sticky Left Column 4: Base Chinese (zh-CN) */}
        <div
          title={term.zhCn}
          className="sticky left-86 z-10 flex items-center justify-between px-3 w-72 h-full bg-inherit border-r-2 border-primary-500/40 text-slate-900 dark:text-slate-100 font-medium truncate shadow-r"
        >
          <span className="truncate">{term.zhCn}</span>
          {term.maxChars && (
            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-1">
              max:{term.maxChars}
            </span>
          )}
        </div>

        {/* Scrollable Language Cells */}
        {languages.map((lang) => {
          const translation = term.translations[lang] || {
            text: '',
            status: 'draft',
            source: 'human',
          };
          return (
            <div key={lang} className="w-56 h-full shrink-0">
              <TermCell
                termId={term.id}
                lang={lang}
                initialValue={translation.text}
                isLocked={term.isLocked}
                status={translation.status}
                source={translation.source}
                maxChars={term.maxChars}
                onSave={onSaveCell}
              />
            </div>
          );
        })}
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.isSelected === next.isSelected &&
      prev.isActive === next.isActive &&
      prev.term.isLocked === next.term.isLocked &&
      prev.term.updatedAt === next.term.updatedAt &&
      prev.term.translations === next.term.translations &&
      prev.languages === next.languages
    );
  }
);

TermRowItem.displayName = 'TermRowItem';
