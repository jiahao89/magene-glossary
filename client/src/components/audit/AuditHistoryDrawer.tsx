import React from 'react';

export interface AuditSnapshotItem {
  id: string;
  versionName: string;
  triggerType: 'MANUAL' | 'DIFF_APPLY' | 'ROLLBACK_BACKUP' | 'C_PUSH';
  operatorName: string;
  comment?: string | null;
  createdAt: string;
  diffSummary?: {
    lang: string;
    oldText: string;
    newText: string;
  }[];
}

export interface AuditHistoryDrawerProps {
  isOpen: boolean;
  termKw: string;
  termZhCn: string;
  snapshots: AuditSnapshotItem[];
  onClose: () => void;
  onRequestRollback: (snapshotId: string, versionName: string) => void;
}

/**
 * AuditHistoryDrawer Component (TASK-704)
 * Git-style sliding drawer from the right with character diff and Time-Machine rollback triggers
 */
export const AuditHistoryDrawer: React.FC<AuditHistoryDrawerProps> = ({
  isOpen,
  termKw,
  termZhCn,
  snapshots,
  onClose,
  onRequestRollback,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs select-none animate-in fade-in duration-200"
      data-testid="audit-history-drawer"
    >
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 font-mono">
                {termKw}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[280px]">
              {termZhCn} • 历史变更时光机
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md text-sm"
          >
            ✕
          </button>
        </div>

        {/* Snapshots Timeline List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {snapshots.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <span>暂无历史快照记录</span>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 flex flex-col gap-2 transition-all hover:border-primary-500/40"
              >
                {/* Snapshot Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400">
                      {snap.versionName}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        snap.triggerType === 'ROLLBACK_BACKUP'
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-semibold'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {snap.triggerType}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(snap.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {snap.comment && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                    "{snap.comment}"
                  </p>
                )}

                {/* Git-Style Red/Green Inline Myers Diff */}
                {snap.diffSummary && snap.diffSummary.length > 0 && (
                  <div className="mt-1 space-y-1.5 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800/80 text-[11px] font-mono">
                    {snap.diffSummary.map((d, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-bold text-slate-400">
                          {d.lang}:
                        </span>
                        <div className="flex flex-col gap-0.5">
                          {d.oldText && (
                            <div className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 line-through">
                              - {d.oldText}
                            </div>
                          )}
                          <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            + {d.newText}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rollback Trigger Button */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => onRequestRollback(snap.id, snap.versionName)}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-lg text-primary-600 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 transition-colors flex items-center gap-1"
                  >
                    <span>⏪</span>
                    <span>回退到此快照</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center">
          <span className="text-[11px] text-slate-400">
            按 <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300 font-mono">Alt + H</kbd> 可快速呼出或关闭历史抽屉
          </span>
        </div>
      </div>
    </div>
  );
};
