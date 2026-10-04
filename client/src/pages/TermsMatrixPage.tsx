import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Download,
  Upload,
  ExternalLink,
  History,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  FileCode2,
  FileSpreadsheet
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
      {/* ── Top Metric Summary Cards ────────────────────────────────────────── */}
      <div className={`p-4 border-b flex items-center justify-between gap-4 shrink-0 ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-6">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">词条总数</div>
            <div className="text-xl font-bold font-mono text-primary-500">{stats.total}</div>
          </div>
          <div className="h-7 w-px bg-slate-800/80" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">全语种就绪</div>
            <div className="text-xl font-bold font-mono text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{stats.translated}</span>
            </div>
          </div>
          <div className="h-7 w-px bg-slate-800/80" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">待翻译缺漏</div>
            <div className="text-xl font-bold font-mono text-amber-500">{stats.todo}</div>
          </div>
          <div className="h-7 w-px bg-slate-800/80" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">字长超限预警</div>
            <div className="text-xl font-bold font-mono text-rose-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>{stats.warnings}</span>
            </div>
          </div>
          <div className="h-7 w-px bg-slate-800/80" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">已锁定保护</div>
            <div className="text-xl font-bold font-mono text-slate-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              <span>{stats.locked}</span>
            </div>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-2">
          {selectedTermIds.size > 0 && (
            <button
              onClick={handleBatchAI}
              disabled={isBatchTranslating}
              className="px-3.5 py-1.5 rounded-lg bg-accent-500 hover:bg-accent-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-accent-500/20 cursor-pointer disabled:opacity-50 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isBatchTranslating ? '正在多模型翻译...' : `批量 AI 翻译 (${selectedTermIds.size})`}</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/20 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建词条</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          {/* Export Dropdown / Buttons */}
          <button
            onClick={() => alert('已生成并导出标准 Excel (.xlsx) 包含完整多语言矩阵')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="导出为原生 Excel 表格"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>导出 Excel</span>
          </button>

          <button
            onClick={() => alert('已调用 glossa-cli 自动编译生成固件嵌入式 C 头文件 strings_lang.h')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title="编译生成 C 语言头文件"
          >
            <FileCode2 className="w-3.5 h-3.5 text-primary-500" />
            <span>生成 C 头文件</span>
          </button>
        </div>
      </div>

      {/* ── Multi-Dimensional Filtering Bar ───────────────────────────────── */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-4 shrink-0 text-xs ${
        theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索 KW 宏名 (如 KW_STOP_RIDE) 或中文基准原文..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
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

          {/* Status Quick Filter Tabs */}
          <div className="flex items-center bg-slate-900/60 p-0.5 rounded-lg border border-slate-800">
            {[
              { id: 'all', label: '全部' },
              { id: 'todo', label: '待补全' },
              { id: 'warning', label: '⚠️ 超长' },
              { id: 'locked', label: '🔒 锁定' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id as any)}
                className={`px-2 py-1 rounded-md text-[11px] transition-colors cursor-pointer ${
                  selectedStatus === st.id
                    ? 'bg-primary-500 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Languages Column Switcher */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <span>展示语种:</span>
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
                className={`px-1.5 py-0.5 rounded font-mono font-bold uppercase transition-colors cursor-pointer ${
                  isVisible
                    ? 'bg-primary-500/20 text-primary-500 border border-primary-500/30'
                    : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── High-Density Multi-Language Grid ──────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-xs text-left">
          {/* Table Header */}
          <thead className={`sticky top-0 z-10 border-b select-none font-semibold ${
            theme === 'dark' ? 'bg-slate-900 text-slate-300 border-slate-800' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            <tr>
              <th className="w-10 px-3 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={filteredTerms.length > 0 && selectedTermIds.size === filteredTerms.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-700 text-primary-500 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="w-12 px-2 py-2.5 text-center">状态</th>
              <th className="w-56 px-3 py-2.5 font-mono">KW 键名</th>
              <th className="w-64 px-3 py-2.5">中文基准原文 (zh-CN)</th>
              <th className="w-20 px-2 py-2.5 text-center font-mono">字长约束</th>
              {visibleLanguages.map((lang) => (
                <th key={lang} className="min-w-[180px] px-3 py-2.5 font-mono uppercase">
                  {lang} 译文
                </th>
              ))}
              <th className="w-28 px-3 py-2.5 text-right">操作</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className={`divide-y ${theme === 'dark' ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
            {filteredTerms.map((term) => {
              const isSelected = selectedTermIds.has(term.id);

              return (
                <tr
                  key={term.id}
                  className={`transition-colors ${
                    isSelected
                      ? theme === 'dark' ? 'bg-primary-950/20' : 'bg-primary-50'
                      : theme === 'dark' ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(term.id)}
                      className="rounded border-slate-700 text-primary-500 focus:ring-0 cursor-pointer"
                    />
                  </td>

                  {/* Lock Status */}
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => onToggleLock(term.id, term.isLocked)}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                      title={term.isLocked ? '点击解锁词条' : '点击锁定词条防改'}
                    >
                      {term.isLocked ? <Lock className="w-3.5 h-3.5 text-amber-500 inline" /> : <Unlock className="w-3.5 h-3.5 opacity-30 inline hover:opacity-100" />}
                    </button>
                  </td>

                  {/* KW */}
                  <td className="px-3 py-2 font-mono font-bold text-slate-200 truncate max-w-[220px]">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{term.kw}</span>
                      {term.meta?.module && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-sans">
                          {term.meta.module}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Chinese Benchmark */}
                  <td className="px-3 py-2 text-slate-300">
                    <div className="line-clamp-2 leading-relaxed" title={term.comment || ''}>
                      {term.zhCn}
                    </div>
                  </td>

                  {/* Max Chars */}
                  <td className="px-2 py-2 text-center font-mono text-[11px] text-slate-400">
                    {term.maxChars ? `${term.maxChars} 字符` : '无限制'}
                  </td>

                  {/* Dynamic Languages Cells */}
                  {visibleLanguages.map((lang) => {
                    const trans = term.translations[lang];
                    const text = trans?.text || '';
                    const isMissing = !text.trim();
                    const isOverflow = term.maxChars && text.length > term.maxChars;
                    const isCellEditing = editingCell?.termId === term.id && editingCell?.lang === lang;

                    return (
                      <td
                        key={lang}
                        className={`px-3 py-1.5 relative group border-r border-slate-800/30 ${
                          isOverflow ? 'bg-rose-950/20' : ''
                        }`}
                      >
                        {isCellEditing ? (
                          <div className="flex items-center gap-1">
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
                              className="w-full px-2 py-1 rounded bg-slate-950 border border-primary-500 text-slate-100 text-xs focus:outline-none"
                            />
                            <span className="text-[10px] text-primary-500 font-mono">↵</span>
                          </div>
                        ) : (
                          <div
                            onClick={() => !term.isLocked && startEditing(term.id, lang, text)}
                            className={`min-h-[28px] px-2 py-1 rounded flex items-center justify-between gap-1 transition-all ${
                              term.isLocked
                                ? 'opacity-70 cursor-not-allowed'
                                : 'cursor-text hover:bg-slate-800/50 hover:border-slate-700'
                            }`}
                          >
                            <span
                              className={`truncate leading-relaxed ${
                                isMissing
                                  ? 'text-amber-500/70 italic text-[11px]'
                                  : isOverflow
                                  ? 'text-rose-400 font-medium'
                                  : 'text-slate-200'
                              }`}
                            >
                              {isMissing ? '+ 点击录入翻译' : text}
                            </span>

                            {/* Tags / Badges */}
                            <div className="flex items-center gap-1 shrink-0">
                              {trans?.source === 'ai' && (
                                <span className="text-[9px] px-1 rounded bg-accent-500/20 text-accent-400 font-mono" title="AI 生成">
                                  AI
                                </span>
                              )}
                              {trans?.source === 'tm' && (
                                <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-400 font-mono" title="TM 记忆库 100% 命中">
                                  TM
                                </span>
                              )}
                              {isOverflow && (
                                <span className="text-[9px] px-1 rounded bg-rose-500/30 text-rose-300 font-mono" title={`超限 ${text.length - (term.maxChars || 0)} 字符`}>
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
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onOpenCatStudio(term.id)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-300 text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        title="在沉浸式 CAT 译员工作台翻译此词条"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>CAT</span>
                      </button>

                      <button
                        onClick={() => onOpenHistory(term.id)}
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        title="查看字段级变更历史与时光机"
                      >
                        <History className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteTerm(term.id)}
                        className="p-1 rounded hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="删除词条"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── New Term Modal ────────────────────────────────────────────────── */}
      <GlossaModalV2
        isOpen={isAddModalOpen}
        title="录入新词条 (New Term)"
        description="向当前固件版本注册新的多语言词条键名与中文基准原文"
        confirmLabel="确认录入并加入词库"
        onConfirm={handleCreateTermSubmit}
        onCancel={() => setIsAddModalOpen(false)}
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              KW 键名 (Macro Identifier) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newKw}
              onChange={(e) => setNewKw(e.target.value)}
              placeholder="例如: KW_PEDAL_CALIBRATION_READY"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              中文基准原文 (zh-CN) <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={newZhCn}
              onChange={(e) => setNewZhCn(e.target.value)}
              placeholder="录入中文原文..."
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">所属功能模块</label>
              <select
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none"
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
              <label className="block text-slate-300 font-semibold mb-1">
                屏幕字长限制 (Max Chars)
              </label>
              <input
                type="number"
                value={newMaxChars}
                onChange={(e) => setNewMaxChars(Number(e.target.value))}
                placeholder="24"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">研发排版注释 / 备注</label>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="例如: 屏幕底部单行展示，超过24字符发生物理硬件截断"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none"
            />
          </div>
        </div>
      </GlossaModalV2>
    </div>
  );
};
