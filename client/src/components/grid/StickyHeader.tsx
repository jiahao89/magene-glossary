import React from 'react';

export interface StickyHeaderProps {
  languages: string[];
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
}

/**
 * StickyHeader Component (TASK-603)
 * Features frosted glassmorphism sticky header with sticky frozen left columns
 */
export const StickyHeader: React.FC<StickyHeaderProps> = React.memo(
  ({ languages, isAllSelected, onToggleSelectAll }) => {
    return (
      <div className="sticky top-0 z-20 flex h-10 w-full min-w-max border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-semibold text-slate-600 dark:text-slate-300 select-none shadow-xs">
        {/* Sticky Left Column 1: Checkbox */}
        <div className="sticky left-0 z-30 flex items-center justify-center w-12 h-full bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800">
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={onToggleSelectAll}
            className="w-4 h-4 rounded text-primary-500 focus:ring-primary-500 focus:ring-offset-0 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-pointer"
          />
        </div>

        {/* Sticky Left Column 2: Lock Status */}
        <div className="sticky left-12 z-30 flex items-center justify-center w-10 h-full bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800">
          <span title="词条锁定状态" className="text-slate-400">
            🔒
          </span>
        </div>

        {/* Sticky Left Column 3: KW Macro Name */}
        <div className="sticky left-22 z-30 flex items-center px-3 w-64 h-full bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-mono">
          <span>宏标识符 (KW)</span>
        </div>

        {/* Sticky Left Column 4: Base Chinese (zh-CN) */}
        <div className="sticky left-86 z-30 flex items-center justify-between px-3 w-72 h-full bg-white/95 dark:bg-slate-900/95 border-r-2 border-primary-500/40 shadow-r">
          <span className="text-primary-700 dark:text-primary-400 font-bold">
            中文基准 (zh-CN)
          </span>
          <span className="text-[10px] text-slate-400 font-normal">基准源</span>
        </div>

        {/* Scrollable Language Columns */}
        {languages.map((lang) => (
          <div
            key={lang}
            className="flex items-center justify-between px-3 w-56 h-full border-r border-slate-200/60 dark:border-slate-800/60"
          >
            <span className="uppercase font-bold tracking-wider text-slate-700 dark:text-slate-300">
              {lang}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 font-mono">
              i18n
            </span>
          </div>
        ))}
      </div>
    );
  }
);

StickyHeader.displayName = 'StickyHeader';
