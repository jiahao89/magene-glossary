import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Zap,
  Lock,
  History,
  Copy,
  Check,
  Languages,
  BookOpen,
  ArrowRight
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
  theme?: 'dark' | 'light';
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
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
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
      className={`flex w-full h-full overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      data-testid="cat-studio-three-pane"
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PANE 1: 词条任务导航流 (320px) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        className={`w-80 shrink-0 border-r flex flex-col transition-colors duration-200 ${
          isDark ? 'bg-slate-900/50 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        {/* Top Header & Search */}
        <div className={`p-3.5 border-b space-y-2.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
          {onBackToMatrix && (
            <button
              onClick={onBackToMatrix}
              className={`text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer mb-1 ${
                isDark ? 'text-slate-400 hover:text-primary-400' : 'text-slate-600 hover:text-primary-600'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回多语言矩阵大表</span>
            </button>
          )}

          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              待办任务清单
            </span>
            <div
              className={`flex items-center p-0.5 rounded-lg border text-[11px] ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                onClick={() => store.setFilterStatus('all')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  store.filterStatus === 'all'
                    ? 'bg-primary-500 text-white shadow-xs'
                    : isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                全部 ({terms.length})
              </button>
              <button
                onClick={() => store.setFilterStatus('todo')}
                className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                  store.filterStatus === 'todo'
                    ? 'bg-primary-500 text-white shadow-xs'
                    : isDark ? 'text-slate-400' : 'text-slate-600'
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
            className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 shadow-2xs'
            }`}
          />
        </div>

        {/* Scrollable Terms List */}
        <div className={`flex-1 overflow-y-auto divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
          {filteredTerms.map((term) => {
            const isSelected = activeTerm?.id === term.id;
            const trans = term.translations[activeLanguage]?.text || '';
            const isMissing = !trans.trim();

            return (
              <div
                key={term.id}
                onClick={() => store.setActiveTerm(term.id, term.kw)}
                className={`p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? isDark
                      ? 'bg-primary-500/15 border-l-3 border-primary-500'
                      : 'bg-primary-50/80 border-l-3 border-primary-500'
                    : isDark
                    ? 'hover:bg-slate-800/40'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400 truncate max-w-[190px]">
                    {term.kw}
                  </span>
                  {isMissing ? (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/30">
                      待翻
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                      已就绪
                    </span>
                  )}
                </div>
                <p className={`text-xs leading-relaxed truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {term.zhCn}
                </p>
                {trans && (
                  <p className={`text-[11px] truncate mt-1 italic ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    {activeLanguage.toUpperCase()}: {trans}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Shortcut Bar */}
        <div
          className={`p-2.5 border-t text-[11px] flex items-center justify-between font-mono ${
            isDark ? 'border-slate-800 bg-slate-950/80 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <span>保存下移: <kbd className="font-bold">Ctrl+↵</kbd></span>
          <span>采纳: <kbd className="font-bold">Alt+1/2</kbd></span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PANE 2: 核心编辑主体与上下文 (1fr) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
        {activeTerm ? (
          <>
            {/* Term Title & Top Actions */}
            <div className={`flex items-center justify-between border-b pb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold font-mono tracking-tight text-primary-600 dark:text-primary-400">
                    {activeTerm.kw}
                  </h2>
                  {activeTerm.isLocked && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 font-bold">
                      <Lock className="w-3 h-3" />
                      <span>已封板加锁</span>
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  所属模块: <span className="font-semibold text-foreground">{activeTerm.meta?.module || 'activity'}</span>
                  {activeTerm.comment && <span> • 排版备注: {activeTerm.comment}</span>}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={onTriggerHistoryDrawer}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>时光机历史 (Alt+H)</span>
                </button>
                <button
                  disabled={isSaving || activeTerm.isLocked}
                  onClick={handleSaveAndNext}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 hover:to-amber-400 text-white text-xs font-bold shadow-md shadow-primary-500/25 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? '正在保存...' : '保存并跳转下一条 (Ctrl+↵)'}</span>
                </button>
              </div>
            </div>

            {/* Chinese Benchmark Card */}
            <div
              className={`p-5 rounded-2xl border space-y-2 transition-colors ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  中文基准原文 (zh-CN)
                </span>
                <button
                  onClick={handleCopyZh}
                  className={`text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedZh ? '已复制原文' : '复制原文'}</span>
                </button>
              </div>
              <p className={`text-base font-medium leading-relaxed ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeTerm.zhCn}
              </p>
            </div>

            {/* Target Language Translation Editor */}
            <div
              className={`p-5 rounded-2xl border space-y-3.5 transition-colors ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <span>{activeLanguage.toUpperCase()} 目标语言译文编辑</span>
                  {isDirty && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
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
                placeholder={`在此录入 ${activeLanguage.toUpperCase()} 规范译文...`}
                className={`w-full p-3.5 rounded-xl border text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/40 disabled:opacity-60 resize-none font-sans transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-primary-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary-500 shadow-2xs'
                }`}
              />
            </div>

            {/* Translation Assets Dock (Glossary + TM + AI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* TM Memory Matching */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    <span>翻译记忆库匹配 (TM)</span>
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                    92% 精确匹配
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl border text-xs font-mono leading-relaxed ${
                    isDark ? 'bg-slate-950 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {mockTMSuggestions[0]?.targetText || 'Heart rate sensor disconnected'}
                </div>
                <button
                  onClick={() => {
                    const text = mockTMSuggestions[0]?.targetText || 'Heart rate sensor disconnected';
                    setEditText(text);
                    setIsDirty(true);
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white'
                      : 'bg-slate-100 hover:bg-emerald-500 text-slate-700 hover:text-white border border-slate-200'
                  }`}
                >
                  采纳 TM 记忆库译文 (Alt+1)
                </button>
              </div>

              {/* AI Copilot Candidates */}
              <div
                className={`p-4 rounded-2xl border space-y-2.5 transition-colors ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>多模型 AI 建议 (DeepSeek-V3)</span>
                  </span>
                  <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                    直连网关 &lt;300ms
                  </span>
                </div>
                <div
                  className={`p-3 rounded-xl border text-xs font-mono leading-relaxed ${
                    isDark ? 'bg-slate-950 border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  {mockAICandidates[0]?.text || 'Heart rate sensor disconnected'}
                </div>
                <button
                  onClick={() => {
                    const text = mockAICandidates[0]?.text || 'Heart rate sensor disconnected';
                    setEditText(text);
                    setIsDirty(true);
                  }}
                  className={`w-full py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 hover:bg-cyan-600 text-slate-200 hover:text-white'
                      : 'bg-slate-100 hover:bg-cyan-500 text-slate-700 hover:text-white border border-slate-200'
                  }`}
                >
                  采纳 AI 候选建议 (Alt+2)
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            请选择左侧词条以开始翻译
          </div>
        )}
      </div>
    </div>
  );
};
