import React, { useState } from 'react';
import { useCatStudioStore } from '../stores/cat-studio.store';
import { TermItem } from '../hooks/useTermsQuery';
import { CatStudioThreePane } from '../components/cat/CatStudioThreePane';
import { GlossaModalV2 } from '../components/common/GlossaModalV2';
import { AuditHistoryDrawer } from '../components/audit/AuditHistoryDrawer';

export interface CatStudioPageProps {
  terms: TermItem[];
  languages: string[];
  activeLanguage?: string;
  onSaveTermTranslation: (termId: string, lang: string, text: string) => Promise<void>;
  onBackToMatrix?: () => void;
  theme: 'dark' | 'light';
}

export const CatStudioPage: React.FC<CatStudioPageProps> = ({
  terms,
  languages,
  activeLanguage = 'en',
  onSaveTermTranslation,
  onBackToMatrix,
  theme,
}) => {
  const catStore = useCatStudioStore();
  const [isRollbackPending, setIsRollbackPending] = useState(false);

  const activeTerm =
    terms.find((t) => t.id === catStore.activeTermId) || terms[0] || null;

  // Rollback action with Regret Protection
  const handleConfirmRollback = async () => {
    setIsRollbackPending(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      catStore.closeRollbackModal();
      alert('已成功通过时光机回退至快照节点！系统已自动生成当前时刻的后悔药备份。');
    } finally {
      setIsRollbackPending(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden select-none">
      {/* ── Sub Navigation Header (Language Switcher & Studio Context) ─────── */}
      <div className={`h-11 px-4 border-b flex items-center justify-between shrink-0 text-xs ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-400">正在翻译目标语种:</span>
          <div className="flex items-center gap-1 font-mono">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => catStore.setActiveLanguage(lang)}
                className={`px-2 py-0.5 rounded uppercase font-bold text-[11px] transition-colors cursor-pointer ${
                  catStore.activeLanguage === lang
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>当前专注词条: <span className="font-mono text-primary-400 font-bold">{activeTerm?.kw}</span></span>
        </div>
      </div>

      {/* ── 3-Pane CAT Studio ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <CatStudioThreePane
          terms={terms}
          languages={languages}
          activeLanguage={catStore.activeLanguage || activeLanguage}
          onSaveTermTranslation={onSaveTermTranslation}
          onTriggerHistoryDrawer={() => catStore.setDiffDrawerOpen(true)}
          onBackToMatrix={onBackToMatrix}
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
                '1. 识别关键词：心率传感器 (Heart rate sensor) + 已断开 (disconnected)\n2. 检查字符上限 max_chars: 当前字符长度符合物理屏幕规格\n3. 统一术语验证：符合迈金固件传感器术语手册。',
              confidence: 0.96,
            },
          ]}
        />
      </div>

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
            operatorName: '张工 (固件研发组)',
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
