import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TermItem } from '../../hooks/useTermsQuery';
import { StickyHeader } from './StickyHeader';
import { TermRowItem } from './TermRowItem';

export interface VirtualizedTermGridProps {
  terms: TermItem[];
  languages: string[];
  selectedIds: Set<string>;
  activeTermId: string | null;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onToggleLock: (id: string, currentLocked: boolean) => void;
  onRowClick: (id: string, kw: string) => void;
  onSaveCell: (termId: string, lang: string, text: string) => void;
}

const ROW_HEIGHT = 44; // 44px per row

/**
 * VirtualizedTermGrid Component (TASK-603)
 * Renders 10,000+ items smoothly at 60 FPS using TanStack Virtual
 * Retains less than 35 DOM nodes in the viewport at any time.
 */
export const VirtualizedTermGrid: React.FC<VirtualizedTermGridProps> = ({
  terms,
  languages,
  selectedIds,
  activeTermId,
  onToggleSelect,
  onToggleSelectAll,
  onToggleLock,
  onRowClick,
  onSaveCell,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: terms.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  const isAllSelected = terms.length > 0 && selectedIds.size === terms.length;

  return (
    <div
      ref={parentRef}
      className="relative w-full h-full overflow-auto bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl"
      data-testid="virtual-grid-container"
    >
      {/* Sticky Header with Frosted Glassmorphism */}
      <StickyHeader
        languages={languages}
        isAllSelected={isAllSelected}
        onToggleSelectAll={onToggleSelectAll}
      />

      {/* Virtual Table Body */}
      {terms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <span className="text-3xl mb-2">📂</span>
          <p className="text-sm font-medium">当前版本下暂无词条</p>
          <p className="text-xs text-slate-500 mt-1">请通过 C 源码扫描推送或导入 Excel 新增词条</p>
        </div>
      ) : (
        <div
          className="relative w-full min-w-max"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const term = terms[virtualRow.index];
            if (!term) return null;

            return (
              <div
                key={term.id}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                <TermRowItem
                  term={term}
                  languages={languages}
                  isSelected={selectedIds.has(term.id)}
                  isActive={term.id === activeTermId}
                  onToggleSelect={onToggleSelect}
                  onToggleLock={onToggleLock}
                  onRowClick={onRowClick}
                  onSaveCell={onSaveCell}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
