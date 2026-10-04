import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  Zap,
  Lock,
  Unlock,
  History,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Lightbulb,
  Check
} from 'lucide-react';
import { TermItem } from '../../hooks/useTermsQuery';
import { useCatStudioStore } from '../../stores/cat-studio.store';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { HardwareConstraintMeter } from '../ui/HardwareConstraintMeter';
import { TMSuggestion, AICandidate } from './AICopilotDock';

export interface CatStudioThreePaneProps {
  terms: TermItem[];
  languages: string[];
  activeLanguage: string;
  onSaveTermTranslation: (termId: string, lang: string, text: string) => Promise<void>;
  onTriggerHistoryDrawer: () => void;
  onBackToMatrix?: () => void;
  mockTMSuggestions?: TMSuggestion[];
  mockAICandidates?: AICandidate[];
}

export const CatStudioThreePane: React.FC<CatStudioThreePaneProps> = ({
  terms,
  languages,
  activeLanguage,
  onSaveTermTranslation,
  onTriggerHistoryDrawer,
  onBackToMatrix,
  mockTMSuggestions = [],
  mockAICandidates = [],
}) => {
  const store = useCatStudioStore();

  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [copiedZh, setCopiedZh] = useState(false);

  // Active term
  const activeTerm =
    terms.find((t) => t.id === store.activeTermId) || terms[0] || null;

  // Sync edit text when term or language changes
  useEffect(() => {
    if (activeTerm) {
      const currentTranslation = activeTerm.translations[activeLanguage]?.text || '';
      setEditText(currentTranslation);
      setIsDirty(false);
      if (store.activeTermId !== activeTerm.id) {
        store.setActiveTerm(activeTerm.id, activeTerm.kw);
      }
    }
  }, [activeTerm?.id, activeLanguage]);

  // Handle Save and Step Next (Ctrl+Enter)
  const handleSaveAndNext = async () => {
    if (!activeTerm) return;
    setIsSaving(true);
    try {
      await onSaveTermTranslation(activeTerm.id, activeLanguage, editText);
      setIsDirty(false);
      const allIds = terms.map((t) => t.id);
      store.stepNextTerm(allIds);
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    onStepNext: () => store.stepNextTerm(terms.map((t) => t.id)),
    onStepPrev: () => store.stepPrevTerm(terms.map((t) => t.id)),
    onSaveAndNext: handleSaveAndNext,
    onAcceptTM: () => {
      if (mockTMSuggestions.length > 0) {
        setEditText(mockTMSuggestions[0].targetText);
        setIsDirty(true);
      }
    },
    onAcceptAI: () => {
      if (mockAICandidates.length > 0) {
        setEditText(mockAICandidates[0].text);
        setIsDirty(true);
      }
    },
    onToggleHistory: onTriggerHistoryDrawer,
  });

  // Filtered terms for Left Pane
  const filteredTerms = terms.filter((t) => {
    if (store.searchQuery) {
      const q = store.searchQuery.toLowerCase();
      if (!t.kw.toLowerCase().includes(q) && !t.zhCn.includes(store.searchQuery)) {
        return false;
      }
    }
    if (store.filterStatus === 'todo') {
      const trans = t.translations[activeLanguage]?.text?.trim();
      if (trans) return false;
    }
    return true;
  });

  const handleCopyZh = () => {
    if (!activeTerm) return;
    navigator.clipboard.writeText(activeTerm.zhCn);
    setCopiedZh(true);
    setTimeout(() => setCopiedZh(false), 1500);
  };

  return (
    <div
      className="flex w-full h-full bg-slate-950 text-slate-100 overflow-hidden select-none"
      data-testid="cat-studio-three-pane"
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PANE 1: 词条任务导航流 (320px) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-slate-800 bg-slate-900/40 flex flex-col">
        {/* Top Filter and Search */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          {onBackToMatrix && (
            <button
              onClick={onBackToMatrix}
              className="text-xs text-slate-400 hover:text-primary-400 flex items-center gap-1 transition-colors cursor-pointer mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回词条矩阵大表</span>
            </button>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">待办与词条清单</span>
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10px]">
              <button
                onClick={() => store.setFilterStatus('all')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  store.filterStatus === 'all'
                    ? 'bg-primary-500 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全部 ({terms.length})
              </button>
              <button
                onClick={() => store.setFilterStatus('todo')}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  store.filterStatus === 'todo'
                    ? 'bg-primary-500 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                待翻译
              </button>
            </div>
          </div>

          <input
            type="text"
            value={store.searchQuery}
            onChange={(e) => store.setSearchQuery(e.target.value)}
            placeholder="搜索 KW 宏名或中文原义..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Scrollable Terms List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
          {filteredTerms.map((term) => {
            const isSelected = activeTerm?.id === term.id;
            const trans = term.translations[activeLanguage]?.text || '';
            const isMissing = !trans.trim();

            return (
              <div
                key={term.id}
                onClick={() => store.setActiveTerm(term.id, term.kw)}
                className={`p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary-500/15 border-l-4 border-primary-500'
                    : 'hover:bg-slate-900/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-slate-200 truncate max-w-[190px]">
                    {term.kw}
                  </span>
                  {isMissing ? (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 font-semibold font-mono">
                      待翻
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold font-mono">
                      已就绪
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{term.zhCn}</p>
                {trans && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 italic">
                    {activeLanguage.toUpperCase()}: {trans}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Shortcut Bar */}
        <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center justify-between font-mono">
          <span>保存并下移: <kbd className="text-slate-300">Ctrl+↵</kbd></span>
          <span>采纳TM/AI: <kbd className="text-slate-300">Alt+1/2</kbd></span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PANE 2: 核心编辑主体与上下文 (1fr) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-5">
        {activeTerm ? (
          <>
            {/* Term Title & Actions */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-primary-400">
                    {activeTerm.kw}
                  </h2>
                  {activeTerm.isLocked && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1 font-mono">
                      <Lock className="w-3 h-3" />
                      <span>已加锁</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  所属模块: <span className="text-slate-300 font-medium">{activeTerm.meta?.module || 'activity'}</span>
                  {activeTerm.comment && <span> • 备注: {activeTerm.comment}</span>}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onTriggerHistoryDrawer}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>时光机历史 (Alt+H)</span>
                </button>
                <button
                  disabled={isSaving || activeTerm.isLocked}
                  onClick={handleSaveAndNext}
                  className="px-4 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold shadow-md shadow-primary-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? '保存中...' : '保存并跳转下一条 (Ctrl+↵)'}</span>
                </button>
              </div>
            </div>

            {/* Chinese Benchmark Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  中文基准原文 (zh-CN)
                </span>
                <button
                  onClick={handleCopyZh}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedZh ? '已复制' : '复制原文'}</span>
                </button>
              </div>
              <p className="text-base text-slate-100 font-medium leading-relaxed">
                {activeTerm.zhCn}
              </p>
            </div>

            {/* Target Language Translation Editor */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span>{activeLanguage.toUpperCase()} 目标语言译文编辑</span>
                  {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                </span>
                <HardwareConstraintMeter
                  currentLength={editText.length}
                  maxChars={activeTerm.maxChars}
                />
              </div>

              <textarea
                rows={3}
                disabled={activeTerm.isLocked}
                value={editText}
                onChange={(e) => {
                  setEditText(e.target.value);
                  setIsDirty(true);
                }}
                placeholder={`在此输入 ${activeLanguage.toUpperCase()} 译文...`}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 resize-none font-sans"
              />
            </div>

            {/* Translation Assets Dock (Glossary + TM + AI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TM Memory Matching */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>翻译记忆库匹配 (TM)</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                    92% 匹配
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono text-slate-200">
                  {mockTMSuggestions[0]?.targetText || 'Heart rate sensor disconnected'}
                </div>
                <button
                  onClick={() => {
                    const text = mockTMSuggestions[0]?.targetText || 'Heart rate sensor disconnected';
                    setEditText(text);
                    setIsDirty(true);
                  }}
                  className="w-full py-1 rounded bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  采纳 TM 译文 (Alt+1)
                </button>
              </div>

              {/* AI Copilot Candidates */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-accent-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>多模型 AI 建议 (DeepSeek-V3)</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">直连网关 &lt;300ms</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-xs font-mono text-slate-200">
                  {mockAICandidates[0]?.text || 'Heart rate sensor disconnected'}
                </div>
                <button
                  onClick={() => {
                    const text = mockAICandidates[0]?.text || 'Heart rate sensor disconnected';
                    setEditText(text);
                    setIsDirty(true);
                  }}
                  className="w-full py-1 rounded bg-slate-800 hover:bg-accent-600 hover:text-slate-950 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  采纳 AI 候选 (Alt+2)
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            选择左侧词条以开始翻译
          </div>
        )}
      </div>
    </div>
  );
};
