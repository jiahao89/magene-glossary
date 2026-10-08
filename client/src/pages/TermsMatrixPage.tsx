import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  Lock,
  Unlock,
  Plus,
  FileSpreadsheet,
  FileCode2,
  ExternalLink,
  History,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Check,
  Languages,
  SlidersHorizontal
} from 'lucide-react';
import { TermItem } from '../hooks/useTermsQuery';
import { GlossaModalV2 } from '../components/common/GlossaModalV2';

export interface TermsMatrixPageProps {
  terms: TermItem[];
  languages: string[];
  onSaveTermTranslation: (termId: string, lang: string, text: string) => Promise<void>;
  onToggleLock: (termId: string, currentLocked: boolean) => void;
  onOpenCatStudio: (termId: string) => void;
  onOpenHistory: (termId: string) => void;
  onAddTerm: (term: Partial<TermItem>) => void;
  onDeleteTerm: (termId: string) => void;
  onBatchAITranslate: (termIds: string[]) => Promise<void>;
  theme: 'dark' | 'light';
}

export const TermsMatrixPage: React.FC<TermsMatrixPageProps> = ({
  terms,
  languages,
  onSaveTermTranslation,
  onToggleLock,
  onOpenCatStudio,
  onOpenHistory,
  onAddTerm,
  onDeleteTerm,
  onBatchAITranslate,
  theme,
}) => {
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'todo' | 'warning' | 'locked'>('all');
  const [selectedTermIds, setSelectedTermIds] = useState<Set<string>>(new Set());
  const [visibleLanguages, setVisibleLanguages] = useState<string[]>(languages.slice(0, 6));

  // Editing state for direct cell editing
  const [editingCell, setEditingCell] = useState<{ termId: string; lang: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingCell, setIsSavingCell] = useState(false);

  // New Term Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newKw, setNewKw] = useState('');
  const [newZhCn, setNewZhCn] = useState('');
  const [newModule, setNewModule] = useState('activity');
  const [newMaxChars, setNewMaxChars] = useState(24);
  const [newComment, setNewComment] = useState('');

  // Batch AI progress
  const [isBatchTranslating, setIsBatchTranslating] = useState(false);

  // Filtered terms
  const filteredTerms = useMemo(() => {
    return terms.filter((term) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchKw = term.kw.toLowerCase().includes(q);
        const matchZh = term.zhCn.includes(searchQuery);
        if (!matchKw && !matchZh) return false;
      }

      // Module filter
      if (selectedModule !== 'all' && term.meta?.module !== selectedModule) {
        return false;
      }

      // Status filter
      if (selectedStatus === 'locked' && !term.isLocked) return false;
      if (selectedStatus === 'warning') {
        const isOverflow = Object.entries(term.translations).some(
          ([_, t]) => term.maxChars && t.text.length > term.maxChars
        );
        if (!isOverflow) return false;
      }
      if (selectedStatus === 'todo') {
        const hasMissing = visibleLanguages.some((lang) => !term.translations[lang]?.text?.trim());
        if (!hasMissing) return false;
      }

      return true;
    });
  }, [terms, searchQuery, selectedModule, selectedStatus, visibleLanguages]);

  // Statistics
  const stats = useMemo(() => {
    let translated = 0;
    let warnings = 0;
    let locked = 0;

    terms.forEach((t) => {
      if (t.isLocked) locked++;
      const isComplete = languages.every((l) => Boolean(t.translations[l]?.text?.trim()));
      if (isComplete) translated++;
      const isOverflow = Object.entries(t.translations).some(
        ([_, tr]) => t.maxChars && tr.text.length > t.maxChars
      );
      if (isOverflow) warnings++;
    });

    return {
      total: terms.length,
      translated,
      todo: terms.length - translated,
      warnings,
      locked,
    };
  }, [terms, languages]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedTermIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTermIds(next);
  };

  const handleSelectAll = () => {
    if (selectedTermIds.size === filteredTerms.length) {
      setSelectedTermIds(new Set());
    } else {
      setSelectedTermIds(new Set(filteredTerms.map((t) => t.id)));
    }
  };

  // Cell editing triggers
  const startEditing = (termId: string, lang: string, initialText: string) => {
    setEditingCell({ termId, lang });
    setEditValue(initialText);
  };

  const commitCellEdit = async () => {
    if (!editingCell) return;
    setIsSavingCell(true);
    try {
      await onSaveTermTranslation(editingCell.termId, editingCell.lang, editValue);
    } finally {
      setIsSavingCell(false);
      setEditingCell(null);
    }
  };

  // Batch AI Translate
  const handleBatchAI = async () => {
    if (selectedTermIds.size === 0) return;
    setIsBatchTranslating(true);
    try {
      await onBatchAITranslate(Array.from(selectedTermIds));
    } finally {
      setIsBatchTranslating(false);
      setSelectedTermIds(new Set());
    }
  };

  // Submit New Term
  const handleCreateTermSubmit = () => {
    if (!newKw.trim() || !newZhCn.trim()) return;
    onAddTerm({
      kw: newKw.toUpperCase().startsWith('KW_') ? newKw.toUpperCase() : `KW_${newKw.toUpperCase()}`,
      zhCn: newZhCn,
      comment: newComment,
      maxChars: Number(newMaxChars) || 24,
      meta: { module: newModule },
      isLocked: false,
      translations: {
        en: { lang: 'en', text: '', status: 'draft', source: 'human' },
        de: { lang: 'de', text: '', status: 'draft', source: 'human' },
        fr: { lang: 'fr', text: '', status: 'draft', source: 'human' },
      },
    });
    setIsAddModalOpen(false);
    setNewKw('');
    setNewZhCn('');
    setNewComment('');
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden select-none">
      {/* ── Top Metric Summary Cards (HeroUI Pro Style) ─────────────────────── */}
      <div
        className={`p-4 border-b shrink-0 transition-colors duration-200 ${
          isDark ? 'bg-slate-900/60 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Stat Metric Group */}
          <div className="flex items-center gap-4 md:gap-8">
            {/* Total Terms */}
            <div className="space-y-0.5">
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                词条总数
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-primary-600 dark:text-primary-400">
                {stats.total}
              </div>
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* Fully Translated */}
            <div className="space-y-0.5">
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                全语种就绪
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>{stats.translated}</span>
              </div>
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* Missing Translations */}
            <div className="space-y-0.5">
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                待翻译缺漏
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {stats.todo}
              </div>
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* Overlength Warnings */}
            <div className="space-y-0.5">
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                字长截断报警
              </div>
              <div className="text-2xl font-bold font-mono tracking-tight text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-5 h-5" />
                <span>{stats.warnings}</span>
              </div>
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* Locked Terms */}
            <div className="space-y-0.5">
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                已封板锁定
              </div>
              <div className={`text-2xl font-bold font-mono tracking-tight flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <Lock className="w-4 h-4 opacity-70" />
                <span>{stats.locked}</span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5">
            {selectedTermIds.size > 0 && (
              <button
                onClick={handleBatchAI}
                disabled={isBatchTranslating}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-accent-500 to-cyan-500 hover:from-accent-600 hover:to-cyan-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-accent-500/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isBatchTranslating ? '正在多模型翻译...' : `批量 AI 补翻 (${selectedTermIds.size})`}</span>
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 hover:to-amber-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>录入新词条</span>
            </button>

            <div className={`h-6 w-px ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* Export Buttons */}
            <button
              onClick={() => alert('已调用 exceljs 导出标准原生 Excel (.xlsx) 多语言矩阵')}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
              }`}
              title="导出为原生 Excel 表格"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              <span>导出 Excel</span>
            </button>

            <button
              onClick={() => alert('已通过 glossa-cli 自动编译生成固件嵌入式 C 头文件 strings_lang.h/c')}
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
              }`}
              title="编译生成嵌入式 C 语言头文件"
            >
              <FileCode2 className="w-4 h-4 text-primary-500" />
              <span>生成 C 头文件</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Multi-Dimensional Filtering Toolbar ────────────────────────────── */}
      <div
        className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs transition-colors duration-200 ${
          isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[260px] flex-1 max-w-md">
            <Search className={`w-4 h-4 absolute left-3 top-2.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 KW 宏名 (如 KW_STOP_RIDE) 或中文原义..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-primary-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-primary-500 shadow-xs'
              }`}
            />
          </div>

          {/* Module Selector */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>所属模块:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800 shadow-xs'
              }`}
            >
              <option value="all">全部模块 (All Modules)</option>
              <option value="activity">🚴 骑行运动 (Activity)</option>
              <option value="sensor">💓 传感器 (Sensor)</option>
              <option value="calibration">⚖️ 外设校准 (Calibration)</option>
              <option value="alert">⚠️ 告警提示 (Alert)</option>
              <option value="navigation">🧭 导航指引 (Navigation)</option>
              <option value="map">🗺️ 地图海拔 (Map)</option>
            </select>
          </div>

          {/* Status Quick Filter Chips */}
          <div
            className={`flex items-center p-0.5 rounded-xl border ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-200/80 border-slate-300/60'
            }`}
          >
            {[
              { id: 'all', label: '全部' },
              { id: 'todo', label: '待补全' },
              { id: 'warning', label: '⚠️ 字符超限' },
              { id: 'locked', label: '🔒 锁定' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedStatus === st.id
                    ? 'bg-primary-500 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Languages Column Switcher */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>展示语言列:</span>
          <div className="flex items-center gap-1">
            {languages.map((lang) => {
              const isVisible = visibleLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  onClick={() => {
                    if (isVisible) {
                      if (visibleLanguages.length > 1) {
                        setVisibleLanguages(visibleLanguages.filter((l) => l !== lang));
                      }
                    } else {
                      setVisibleLanguages([...visibleLanguages, lang]);
                    }
                  }}
                  className={`px-2 py-1 rounded-lg font-mono font-bold uppercase text-[11px] transition-all cursor-pointer ${
                    isVisible
                      ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400 border border-primary-500/30'
                      : isDark
                      ? 'bg-slate-900/60 text-slate-500 hover:text-slate-300 border border-slate-800'
                      : 'bg-white text-slate-400 hover:text-slate-700 border border-slate-200'
                  }`}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── High-Readability Multi-Language Data Grid (HeroUI / shadcn Style) ─ */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          {/* Table Header */}
          <thead
            className={`sticky top-0 z-10 border-b select-none font-semibold text-xs tracking-wider uppercase transition-colors duration-200 ${
              isDark
                ? 'bg-slate-900/95 text-slate-300 border-slate-800 backdrop-blur-md'
                : 'bg-slate-100/95 text-slate-700 border-slate-200 backdrop-blur-md'
            }`}
          >
            <tr className="h-11">
              <th className="w-12 px-3 text-center">
                <input
                  type="checkbox"
                  checked={filteredTerms.length > 0 && selectedTermIds.size === filteredTerms.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-400 text-primary-500 focus:ring-primary-500/30 cursor-pointer"
                />
              </th>
              <th className="w-14 px-2 text-center">状态</th>
              <th className="w-60 px-4 font-mono">KW 键名</th>
              <th className="w-72 px-4">中文基准原文 (zh-CN)</th>
              <th className="w-24 px-3 text-center font-mono">字长约束</th>
              {visibleLanguages.map((lang) => (
                <th key={lang} className="min-w-[200px] px-4 font-mono">
                  {lang} 译文
                </th>
              ))}
              <th className="w-32 px-4 text-right">操作</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody
            className={`divide-y transition-colors duration-200 ${
              isDark ? 'divide-slate-800/80 bg-slate-950/40' : 'divide-slate-200/90 bg-white'
            }`}
          >
            {filteredTerms.map((term) => {
              const isSelected = selectedTermIds.has(term.id);

              return (
                <tr
                  key={term.id}
                  className={`min-h-[56px] transition-colors ${
                    isSelected
                      ? isDark
                        ? 'bg-primary-950/25'
                        : 'bg-primary-50/70'
                      : isDark
                      ? 'hover:bg-slate-900/60'
                      : 'hover:bg-slate-50/90'
                  }`}
                >
                  {/* Row Checkbox */}
                  <td className="px-3 py-3 text-center align-middle">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(term.id)}
                      className="rounded border-slate-400 text-primary-500 focus:ring-primary-500/30 cursor-pointer"
                    />
                  </td>

                  {/* Lock Indicator Button */}
                  <td className="px-2 py-3 text-center align-middle">
                    <button
                      onClick={() => onToggleLock(term.id, term.isLocked)}
                      className="p-1 rounded-lg hover:bg-slate-500/10 transition-colors cursor-pointer"
                      title={term.isLocked ? '已锁定 (点击解锁)' : '未锁定 (点击锁定防篡改)'}
                    >
                      {term.isLocked ? (
                        <Lock className="w-4 h-4 text-amber-500 inline" />
                      ) : (
                        <Unlock className="w-4 h-4 opacity-25 hover:opacity-80 inline" />
                      )}
                    </button>
                  </td>

                  {/* KW Identifier */}
                  <td className="px-4 py-3 align-middle">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[12px] font-bold text-primary-600 dark:text-primary-400 truncate max-w-[200px]">
                          {term.kw}
                        </span>
                      </div>
                      {term.meta?.module && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-sans inline-block ${
                          isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {term.meta.module}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Chinese Benchmark Text */}
                  <td className="px-4 py-3 align-middle">
                    <p
                      className={`text-[13px] font-medium leading-relaxed ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                      title={term.comment || ''}
                    >
                      {term.zhCn}
                    </p>
                    {term.comment && (
                      <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {term.comment}
                      </p>
                    )}
                  </td>

                  {/* Max Chars Constraint Meter */}
                  <td className="px-3 py-3 text-center align-middle font-mono text-xs">
                    {term.maxChars ? (
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        ≤ {term.maxChars}
                      </span>
                    ) : (
                      <span className="text-slate-400">无上限</span>
                    )}
                  </td>

                  {/* Dynamic Target Languages Columns */}
                  {visibleLanguages.map((lang) => {
                    const trans = term.translations[lang];
                    const text = trans?.text || '';
                    const isMissing = !text.trim();
                    const isOverflow = term.maxChars && text.length > term.maxChars;
                    const isCellEditing = editingCell?.termId === term.id && editingCell?.lang === lang;

                    return (
                      <td
                        key={lang}
                        className={`px-4 py-2.5 align-middle border-r transition-colors ${
                          isDark ? 'border-slate-800/40' : 'border-slate-200/50'
                        } ${
                          isOverflow
                            ? isDark ? 'bg-rose-950/20' : 'bg-rose-50/60'
                            : ''
                        }`}
                      >
                        {isCellEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitCellEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitCellEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className={`w-full px-3 py-1.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                                isDark
                                  ? 'bg-slate-900 border-primary-500 text-slate-100'
                                  : 'bg-white border-primary-500 text-slate-900 shadow-sm'
                              }`}
                            />
                            <button
                              onClick={commitCellEdit}
                              className="p-1 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => !term.isLocked && startEditing(term.id, lang, text)}
                            className={`min-h-[38px] px-3 py-1.5 rounded-xl flex items-center justify-between gap-2 transition-all ${
                              term.isLocked
                                ? 'opacity-70 cursor-not-allowed'
                                : isDark
                                ? 'cursor-pointer hover:bg-slate-800/60 hover:ring-1 hover:ring-slate-700'
                                : 'cursor-pointer hover:bg-slate-100 hover:ring-1 hover:ring-slate-200 shadow-2xs'
                            }`}
                          >
                            <span
                              className={`text-xs leading-relaxed truncate ${
                                isMissing
                                  ? 'text-amber-600 dark:text-amber-400 font-medium italic'
                                  : isOverflow
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : isDark
                                  ? 'text-slate-200'
                                  : 'text-slate-800'
                              }`}
                            >
                              {isMissing ? '+ 点击录入翻译' : text}
                            </span>

                            {/* Source & Overflow Tags */}
                            <div className="flex items-center gap-1 shrink-0">
                              {trans?.source === 'ai' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-accent-500/15 text-accent-600 dark:text-accent-400 font-mono font-bold border border-accent-500/30" title="直连 AI 翻译">
                                  AI
                                </span>
                              )}
                              {trans?.source === 'tm' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/30" title="TM 记忆库 100% 命中">
                                  TM
                                </span>
                              )}
                              {isOverflow && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-500/20 text-rose-600 dark:text-rose-400 font-mono font-bold border border-rose-500/40" title={`已超出设计上限 ${text.length - (term.maxChars || 0)} 字符`}>
                                  +{text.length - (term.maxChars || 0)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Actions Column */}
                  <td className="px-4 py-3 text-right align-middle">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenCatStudio(term.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold shadow-xs shadow-primary-500/20 transition-all flex items-center gap-1 cursor-pointer"
                        title="在沉浸式 CAT 译员工作台专注翻译"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>CAT</span>
                      </button>

                      <button
                        onClick={() => onOpenHistory(term.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                        }`}
                        title="查看变更审计与时光机"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteTerm(term.id)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isDark ? 'hover:bg-rose-950/40 text-slate-500 hover:text-rose-400' : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                        }`}
                        title="删除词条"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── New Term Modal (GlossaModalV2) ─────────────────────────────────── */}
      <GlossaModalV2
        isOpen={isAddModalOpen}
        title="录入新词条 (New Term Registration)"
        description="向当前固件版本注册新的多语言词条键名与中文基准原文"
        confirmLabel="确认录入并加入词库"
        onConfirm={handleCreateTermSubmit}
        onCancel={() => setIsAddModalOpen(false)}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              KW 宏键名 (Macro Identifier) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              placeholder="例如: KW_PEDAL_CALIBRATION_READY"
              className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
              }`}
            />
          </div>

          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              中文基准原文 (zh-CN) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={newZhCn}
              onChange={(e) => setNewZhCn(e.target.value)}
              placeholder="输入中文原文..."
              className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
              }`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                所属功能模块
              </label>
              <select
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800 shadow-xs'
                }`}
              >
                <option value="activity">骑行运动 (Activity)</option>
                <option value="sensor">传感器 (Sensor)</option>
                <option value="alert">提示告警 (Alert)</option>
                <option value="calibration">外设校准 (Calibration)</option>
                <option value="navigation">路线导航 (Navigation)</option>
                <option value="map">地图海拔 (Map)</option>
              </select>
            </div>

            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                屏幕字长限制 (Max Chars)
              </label>
              <input
                type="number"
                value={newMaxChars}
                onChange={(e) => setNewMaxChars(Number(e.target.value))}
                placeholder="24"
                className={`w-full px-3 py-2 rounded-xl border font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
                }`}
              />
            </div>
          </div>

          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              排版注释说明
            </label>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="例如: 显示于码表主屏幕底部状态栏"
              className={`w-full px-3 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-xs'
              }`}
            />
          </div>
        </div>
      </GlossaModalV2>
    </div>
  );
};
