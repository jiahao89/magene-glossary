import React, { useState, useEffect } from 'react';
import { TermItem } from '../../hooks/useTermsQuery';
import { useCatStudioStore } from '../../stores/cat-studio.store';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { HardwareConstraintMeter } from '../ui/HardwareConstraintMeter';
import { HardwareScreenEmulator } from './HardwareScreenEmulator';
import { VisualContextViewer } from './VisualContextViewer';
import { AICopilotDock, TMSuggestion, AICandidate } from './AICopilotDock';

export interface CatStudioThreePaneProps {
  terms: TermItem[];
  languages: string[];
  activeLanguage: string;
  onSaveTermTranslation: (termId: string, lang: string, text: string) => Promise<void>;
  onTriggerHistoryDrawer: () => void;
  mockTMSuggestions?: TMSuggestion[];
  mockAICandidates?: AICandidate[];
}

/**
 * CatStudioThreePane Component (TASK-701)
 * HeroUI Pro Mail-Template inspired 3-pane layout for high-throughput translation
 */
export const CatStudioThreePane: React.FC<CatStudioThreePaneProps> = ({
  terms,
  languages,
  activeLanguage,
  onSaveTermTranslation,
  onTriggerHistoryDrawer,
  mockTMSuggestions = [],
  mockAICandidates = [],
}) => {
  const store = useCatStudioStore();

  const [editText, setEditText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Active term derived from store or first term
  const activeTerm =
    terms.find((t) => t.id === store.activeTermId) || terms[0] || null;

  // Initialize/sync edit text when active term or language changes
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

  // Filtered terms for Pane 2
  const filteredTerms = terms.filter((t) => {
    if (store.searchQuery && !t.kw.toLowerCase().includes(store.searchQuery.toLowerCase()) && !t.zhCn.includes(store.searchQuery)) {
      return false;
    }
    return true;
  });

  return (
    <div
      className="flex w-full h-full min-h-[720px] bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl select-none"
      data-testid="cat-studio-three-pane"
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PANE 1: 分类与漏斗 (300px) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="w-[280px] shrink-0 border-r border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
        <div className="space-y-5">
          {/* Target Language Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              目标翻译语种
            </label>
            <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto p-1 bg-slate-950/60 rounded-xl border border-slate-800">
              {languages.map((lang) => (
                <button
                  key={lang}
                  onClick={() => store.setActiveLanguage(lang)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                    store.activeLanguage === lang
                      ? 'bg-primary-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="uppercase">{lang}</span>
                  {store.activeLanguage === lang && <span className="text-[10px]">●</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Module Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              功能模块分组
            </label>
            <div className="space-y-1">
              {[
                { id: 'all', label: '全部词条', icon: '📦' },
                { id: 'riding', label: '骑行仪表盘', icon: '🚴' },
                { id: 'sensors', label: '传感器与雷达', icon: '📡' },
                { id: 'navigation', label: '地图与导航', icon: '🗺️' },
                { id: 'system', label: '系统设置', icon: '⚙️' },
              ].map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => store.setFilterModule(mod.id)}
                  className={`w-full px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                    store.filterModule === mod.id
                      ? 'bg-slate-800 text-primary-400 font-bold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <span>{mod.icon}</span>
                  <span>{mod.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              QA 质检状态
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: '全部' },
                { id: 'todo', label: '待翻译' },
                { id: 'qa_warning', label: '⚠️ 溢出/报错' },
                { id: 'approved', label: '已审批' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => store.setFilterStatus(st.id as any)}
                  className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
                    store.filterStatus === st.id
                      ? 'bg-accent-500/20 text-accent-400 border border-accent-500/40 font-semibold'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Shortcut Cheat-Sheet */}
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 space-y-1">
          <div className="font-bold text-slate-300 mb-1">⌨️ 快捷键指南</div>
          <div className="flex justify-between">
            <span>步进切换</span>
            <kbd className="font-mono text-slate-300">J / K</kbd>
          </div>
          <div className="flex justify-between">
            <span>保存并下移</span>
            <kbd className="font-mono text-slate-300">Ctrl + ↵</kbd>
          </div>
          <div className="flex justify-between">
            <span>采纳 TM / AI</span>
            <kbd className="font-mono text-slate-300">Alt + 1 / 2</kbd>
          </div>
          <div className="flex justify-between">
            <span>时光机历史</span>
            <kbd className="font-mono text-slate-300">Alt + H</kbd>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PANE 2: 高密度词条导航列表 (360px) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="w-[360px] shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col">
        {/* Search Header */}
        <div className="p-3 border-b border-slate-800">
          <input
            type="text"
            value={store.searchQuery}
            onChange={(e) => store.setSearchQuery(e.target.value)}
            placeholder="搜索 KW 宏名或中文原义..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Scrollable Terms List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {filteredTerms.map((term) => {
            const isSelected = activeTerm?.id === term.id;
            const trans = term.translations[store.activeLanguage]?.text || '';
            const isMissing = !trans.trim();

            return (
              <div
                key={term.id}
                onClick={() => store.setActiveTerm(term.id, term.kw)}
                className={`p-3 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary-500/15 border-l-4 border-primary-500'
                    : 'hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-slate-200 truncate max-w-[200px]">
                    {term.kw}
                  </span>
                  {term.isLocked && <span className="text-xs">🔒</span>}
                  {isMissing ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">
                      待翻
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-semibold">
                      已就绪
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate">{term.zhCn}</p>
                {trans && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 italic">
                    {store.activeLanguage}: {trans}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* PANE 3: 沉浸式翻译主体与硬件上下文 (1fr) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-slate-950 overflow-y-auto">
        {activeTerm ? (
          <div className="p-6 space-y-6 max-w-4xl">
            {/* Top Info Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-mono text-primary-400">
                    {activeTerm.kw}
                  </h2>
                  {activeTerm.isLocked && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      🔒 锁定词条
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: {activeTerm.id} • 硬件型号: C606 Smart Computer
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onTriggerHistoryDrawer}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5"
                >
                  <span>⏳ 时光机历史 (Alt+H)</span>
                </button>
                <button
                  disabled={isSaving || activeTerm.isLocked}
                  onClick={handleSaveAndNext}
                  className="px-4 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold shadow-md shadow-primary-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? '保存中...' : '保存并跳转 (Ctrl+↵)'}
                </button>
              </div>
            </div>

            {/* Chinese Benchmark Card */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                中文基准原文 (zh-CN)
              </span>
              <p className="text-base text-slate-100 font-medium leading-relaxed">
                {activeTerm.zhCn}
              </p>
            </div>

            {/* Target Language Translation Editor */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-primary-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>{store.activeLanguage} 目标译文编辑</span>
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
                placeholder={`在此录入 ${store.activeLanguage} 目标译文...`}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 resize-none font-sans"
              />
            </div>

            {/* Bottom 2 Columns: Hardware Simulator & AI Dock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Context: C606 LCD/OLED Dot-matrix Emulator */}
              <HardwareScreenEmulator
                mode={store.activeHardwareMode}
                text={editText}
                kw={activeTerm.kw}
                onToggleMode={store.setHardwareMode}
              />

              {/* Right Context: AI Copilot Dock */}
              <AICopilotDock
                tmSuggestions={mockTMSuggestions}
                aiCandidates={mockAICandidates}
                isLoadingAI={false}
                onAdoptTM={(txt) => {
                  setEditText(txt);
                  setIsDirty(true);
                }}
                onAdoptAI={(txt) => {
                  setEditText(txt);
                  setIsDirty(true);
                }}
                onTriggerAIRefresh={() => {}}
              />
            </div>

            {/* Visual Context Viewer (Screenshot Hotspot) */}
            <VisualContextViewer
              kw={activeTerm.kw}
              imageUrl={null} // Can be populated with mock or real image
              hotspot={null}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
            选择左侧词条以开始翻译
          </div>
        )}
      </div>
    </div>
  );
};
