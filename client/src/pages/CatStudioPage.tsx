import React, { useState } from 'react';
import { useCatStudioStore } from '../stores/cat-studio.store';
import { useGridSelectionStore } from '../stores/grid-selection.store';
import { TermItem } from '../hooks/useTermsQuery';
import { CatStudioThreePane } from '../components/cat/CatStudioThreePane';
import { VirtualizedTermGrid } from '../components/grid/VirtualizedTermGrid';
import { GlossaModalV2 } from '../components/common/GlossaModalV2';
import { AuditHistoryDrawer } from '../components/audit/AuditHistoryDrawer';

export interface CatStudioPageProps {
  initialTerms?: TermItem[];
}

const DEFAULT_LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'ja', 'ko', 'ru'];

/**
 * CatStudioPage (TASK-701)
 * Primary studio page hosting the 3-Pane CAT studio, 10k Virtual Grid, and Safety Modals.
 */
export const CatStudioPage: React.FC<CatStudioPageProps> = ({ initialTerms = [] }) => {
  const [viewMode, setViewMode] = useState<'cat' | 'grid'>('cat');
  const [terms, setTerms] = useState<TermItem[]>(initialTerms);
  const [isRollbackPending, setIsRollbackPending] = useState(false);

  const catStore = useCatStudioStore();
  const gridStore = useGridSelectionStore();

  const activeTerm =
    terms.find((t) => t.id === catStore.activeTermId) || terms[0] || null;

  // Save term translation handler
  const handleSaveTermTranslation = async (termId: string, lang: string, text: string) => {
    setTerms((prev) =>
      prev.map((t) => {
        if (t.id !== termId) return t;
        return {
          ...t,
          translations: {
            ...t.translations,
            [lang]: {
              ...(t.translations[lang] || { lang }),
              text,
              status: 'reviewed',
              source: 'human',
              updatedAt: new Date().toISOString(),
            },
          },
        };
      })
    );
  };

  // Toggle lock handler
  const handleToggleLock = (termId: string, currentLocked: boolean) => {
    setTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, isLocked: !currentLocked } : t))
    );
  };

  // Rollback action with Regret Protection
  const handleConfirmRollback = async () => {
    setIsRollbackPending(true);
    try {
      // Simulate rollback call to backend TimeMachineRollbackService
      await new Promise((r) => setTimeout(r, 600));
      catStore.closeRollbackModal();
    } finally {
      setIsRollbackPending(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ── Top Enterprise Header Bar ────────────────────────────────────────── */}
      <header className="h-14 shrink-0 px-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-md shadow-primary-500/20">
              G
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100">GlossaHub</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary-500/20 text-primary-400 font-bold">
                  v2.0 Pro
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                迈金 C606 智能码表及固件词条多语言协同平台
              </p>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800" />

          {/* Project & Version Selector Badges */}
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium">
              🚴 迈金 C606 智能码表
            </span>
            <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
              🏷️ v2.0.0 (活跃未封板)
            </span>
          </div>
        </div>

        {/* View Switcher Tabs (CAT 3-Pane vs Virtual Grid) */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('cat')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              viewMode === 'cat'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>✨</span>
            <span>CAT 译员工作台</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              viewMode === 'grid'
                ? 'bg-primary-500 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📊</span>
            <span>虚拟全览大网格 ({terms.length})</span>
          </button>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2">
          {gridStore.selectedTermIds.size > 0 && (
            <button
              onClick={() => {}}
              className="px-3 py-1.5 rounded-lg bg-accent-500/20 hover:bg-accent-500/30 text-accent-400 border border-accent-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>⚡ AI 批量翻译 ({gridStore.selectedTermIds.size})</span>
            </button>
          )}

          <button
            onClick={() => catStore.setDiffDrawerOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <span>⏳ 时光机 (Alt+H)</span>
          </button>
        </div>
      </header>

      {/* ── Main Viewport Content ─────────────────────────────────────────── */}
      <main className="flex-1 p-4 overflow-hidden">
        {viewMode === 'cat' ? (
          <CatStudioThreePane
            terms={terms}
            languages={DEFAULT_LANGUAGES}
            activeLanguage={catStore.activeLanguage}
            onSaveTermTranslation={handleSaveTermTranslation}
            onTriggerHistoryDrawer={() => catStore.setDiffDrawerOpen(true)}
            mockTMSuggestions={[
              {
                sourceText: activeTerm?.zhCn || '心率传感器已断开',
                targetText: 'Heart rate sensor disconnected',
                similarity: 92,
                domain: 'Sensors',
              },
            ]}
            mockAICandidates={[
              {
                provider: 'DeepSeek-V3',
                text: 'Heart rate sensor disconnected',
                reasoningChain:
                  '1. 识别固件关键词：心率传感器 (Heart rate sensor) + 已断开 (disconnected)\n2. 检查字符上限 max_chars=32: 当前 31 字符符合标准\n3. 术语一致性验证：符合迈金固件雷达与传感器术语手册。',
                confidence: 0.96,
              },
            ]}
          />
        ) : (
          <div className="w-full h-full flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-400">
                双击或点击单元格即可高频打字，1.5 秒防抖自动落库，粘性固定左侧 KW 与中文列。
              </span>
              <span className="text-xs font-mono text-slate-500">
                共 {terms.length} 条固件词条 • 10 语言矩阵
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <VirtualizedTermGrid
                terms={terms}
                languages={DEFAULT_LANGUAGES}
                selectedIds={gridStore.selectedTermIds}
                activeTermId={catStore.activeTermId}
                onToggleSelect={gridStore.toggleSelectTerm}
                onToggleSelectAll={() => gridStore.selectAllTerms(terms.map((t) => t.id))}
                onToggleLock={handleToggleLock}
                onRowClick={(id, kw) => catStore.setActiveTerm(id, kw)}
                onSaveCell={handleSaveTermTranslation}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── Regret-Safety Time-Machine Rollback Modal ──────────────────────── */}
      <GlossaModalV2
        isOpen={catStore.isRollbackModalOpen}
        title="确认时光机快照回退"
        description={`您即将把词条回退至快照 [${catStore.selectedRollbackSnapshotId}]`}
        isPending={isRollbackPending}
        confirmLabel="确认并自动备份后悔药"
        onConfirm={handleConfirmRollback}
        onCancel={catStore.closeRollbackModal}
      >
        <p className="text-xs text-slate-400 leading-relaxed">
          回退操作将原子级恢复该快照下对应语种的译文与元数据。系统已开启双向撤销保障，本次回退前的数据已被无损备份。
        </p>
      </GlossaModalV2>

      {/* ── Sliding History Audit & Diff Drawer ───────────────────────────── */}
      <AuditHistoryDrawer
        isOpen={catStore.isDiffDrawerOpen}
        termKw={activeTerm?.kw || 'KW_UNKNOWN'}
        termZhCn={activeTerm?.zhCn || ''}
        snapshots={[
          {
            id: 'snap-v1.9-rc2',
            versionName: 'v1.9.0-rc2',
            triggerType: 'MANUAL',
            operatorName: '张工 (固件组)',
            comment: '修复西班牙语字符超限换行问题',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            diffSummary: [
              {
                lang: 'es',
                oldText: 'El sensor de frecuencia cardíaca está desconectado',
                newText: 'Sensor FC desconectado',
              },
            ],
          },
          {
            id: 'snap-v1.8-final',
            versionName: 'v1.8.0',
            triggerType: 'C_PUSH',
            operatorName: 'glossa-cli',
            comment: 'C 源码宏扫描首次同步入库',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            diffSummary: [
              {
                lang: 'en',
                oldText: '',
                newText: 'Heart rate sensor disconnected',
              },
            ],
          },
        ]}
        onClose={() => catStore.setDiffDrawerOpen(false)}
        onRequestRollback={(snapId) => catStore.openRollbackModal(snapId)}
      />
    </div>
  );
};
