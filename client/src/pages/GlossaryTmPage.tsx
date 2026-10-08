import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  ShieldAlert,
  Sparkles,
  Zap,
  CheckCircle2,
  Database,
  ArrowRight,
  Info
} from 'lucide-react';
import { GlossaryTerm, INITIAL_GLOSSARY_TERMS } from '../data/mock-data';
import { GlossaModalV2 } from '../components/common/GlossaModalV2';

export interface GlossaryTmPageProps {
  theme: 'dark' | 'light';
}

export const GlossaryTmPage: React.FC<GlossaryTmPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'glossary' | 'tm'>('glossary');
  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryTerm[]>(INITIAL_GLOSSARY_TERMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Term Form
  const [newSource, setNewSource] = useState('');
  const [newDomain, setNewDomain] = useState('运动与状态');
  const [newForbidden, setNewForbidden] = useState('');
  const [newEn, setNewEn] = useState('');
  const [newDe, setNewDe] = useState('');
  const [newFr, setNewFr] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // TM Interactive Test
  const [tmTestInput, setTmTestInput] = useState('心率传感器已断开连接');
  const [tmMatchResult, setTmMatchResult] = useState<{
    similarity: number;
    matchType: 'EXACT_100' | 'FUZZY';
    targetText: string;
    latencyMs: number;
  } | null>({
    similarity: 100,
    matchType: 'EXACT_100',
    targetText: 'Warning: Sensor disconnected, retry',
    latencyMs: 14,
  });

  const handleTestTM = () => {
    if (!tmTestInput.trim()) return;
    setTmMatchResult({
      similarity: 94,
      matchType: 'FUZZY',
      targetText: 'Heart rate sensor disconnected',
      latencyMs: 18,
    });
  };

  const handleAddGlossarySubmit = () => {
    if (!newSource.trim()) return;
    const term: GlossaryTerm = {
      id: `gloss-${Date.now()}`,
      sourceText: newSource,
      domain: newDomain,
      forbiddenWords: newForbidden.split(',').map((w) => w.trim()).filter(Boolean),
      notes: newNotes,
      translations: {
        en: newEn,
        de: newDe,
        fr: newFr,
      },
    };
    setGlossaryTerms([...glossaryTerms, term]);
    setIsAddModalOpen(false);
    setNewSource('');
    setNewForbidden('');
    setNewEn('');
    setNewDe('');
    setNewFr('');
    setNewNotes('');
  };

  const filteredGlossary = glossaryTerms.filter((term) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      term.sourceText.toLowerCase().includes(q) ||
      term.domain.toLowerCase().includes(q) ||
      Object.values(term.translations).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div
      className={`flex flex-col w-full h-full overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ── Top Header Toolbar (HeroUI Style) ──────────────────────────────── */}
      <div
        className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 transition-colors duration-200 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={() => setActiveTab('glossary')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'glossary'
                  ? 'bg-primary-500 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>统一术语库 (Glossary)</span>
            </button>
            <button
              onClick={() => setActiveTab('tm')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'tm'
                  ? 'bg-primary-500 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>向量记忆库 (Translation Memory)</span>
            </button>
          </div>
        </div>

        {activeTab === 'glossary' && (
          <div className="flex items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索标准术语或领域..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-primary-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary-500 shadow-2xs'
                }`}
              />
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 hover:to-amber-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>添加规范术语</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Main View Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'glossary' ? (
          <div className="space-y-4 max-w-6xl">
            <div
              className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs transition-colors ${
                isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <span className={`flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <Info className="w-4 h-4 text-primary-500 shrink-0" />
                <span>迈金科技官方术语库：强制注入直连 AI 提示词与译员辅助工作台，严格防范禁用词。</span>
              </span>
              <span className={`font-mono text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                共收录 {filteredGlossary.length} 组核心业务术语
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGlossary.map((term) => (
                <div
                  key={term.id}
                  className={`p-5 rounded-2xl border space-y-3.5 transition-all ${
                    isDark
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      : 'bg-white border-slate-200/90 hover:border-primary-400/50 shadow-xs'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between pb-3 border-b ${
                      isDark ? 'border-slate-800' : 'border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-base font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {term.sourceText}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          isDark
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {term.domain}
                      </span>
                    </div>
                  </div>

                  {/* Standard Translations */}
                  <div className="space-y-1.5 text-xs">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      标准规范译文
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      {Object.entries(term.translations).map(([lang, text]) => (
                        <div
                          key={lang}
                          className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs ${
                            isDark
                              ? 'bg-slate-950/80 border-slate-800/80'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <span className="text-primary-600 dark:text-primary-400 uppercase font-bold text-[11px]">
                            {lang}:
                          </span>
                          <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                            {text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Forbidden Words */}
                  {term.forbiddenWords.length > 0 && (
                    <div className="text-xs space-y-1.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>严禁使用词汇 (Forbidden)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {term.forbiddenWords.map((w) => (
                          <span
                            key={w}
                            className={`px-2 py-0.5 rounded-lg border text-[11px] line-through font-mono font-medium ${
                              isDark
                                ? 'bg-rose-950/30 text-rose-300 border-rose-900/40'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {term.notes && (
                    <p className={`text-[11px] italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      规则注释: {term.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* TM Vector View */
          <div className="space-y-5 max-w-4xl">
            {/* TM Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                className={`p-4 rounded-2xl border space-y-1 transition-colors ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}
              >
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  向量化 TM 语料库
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  2,840 条
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  PostgreSQL pgvector 预置余弦索引
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-1 transition-colors ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}
              >
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  100% 精确匹配速度
                </div>
                <div className="text-2xl font-bold font-mono text-primary-600 dark:text-primary-400">
                  &lt; 18 ms
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  0 API 成本，本地直接极速返回
                </p>
              </div>

              <div
                className={`p-4 rounded-2xl border space-y-1 transition-colors ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
                }`}
              >
                <div className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  历史命中覆盖率
                </div>
                <div className="text-2xl font-bold font-mono text-accent-600 dark:text-accent-400">
                  68.4%
                </div>
                <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  有效缩短 70% 批量翻译总耗时
                </p>
              </div>
            </div>

            {/* Interactive Vector Search Simulator */}
            <div
              className={`p-5 rounded-2xl border space-y-4 transition-colors ${
                isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
              }`}
            >
              <div>
                <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <Sparkles className="w-4 h-4 text-accent-500" />
                  <span>TM 相似度向量检索实时体验</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  输入任意中文文本，模拟测试 pgvector 余弦相似度召回与 100% 精确直通
                </p>
              </div>

              <div className="flex gap-2.5">
                <input
                  type="text"
                  value={tmTestInput}
                  onChange={(e) => setTmTestInput(e.target.value)}
                  placeholder="输入中文原文测试 TM..."
                  className={`flex-1 px-3.5 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-primary-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-primary-500 shadow-2xs'
                  }`}
                />
                <button
                  onClick={handleTestTM}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-primary-500/20 active:scale-[0.98]"
                >
                  检索记忆库
                </button>
              </div>

              {tmMatchResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2.5 ${
                    isDark
                      ? 'bg-slate-950/80 border-emerald-500/30'
                      : 'bg-emerald-50/60 border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>余弦相似度: {tmMatchResult.similarity}% ({tmMatchResult.matchType})</span>
                    </span>
                    <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      检索耗时: {tmMatchResult.latencyMs} ms
                    </span>
                  </div>
                  <div
                    className={`font-mono p-3 rounded-lg border text-xs ${
                      isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-200'
                        : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                    }`}
                  >
                    {tmMatchResult.targetText}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Glossary Modal ────────────────────────────────────────────── */}
      <GlossaModalV2
        isOpen={isAddModalOpen}
        title="添加专业规范术语"
        description="定义迈金官方统一翻译词汇规范与禁用黑名单"
        confirmLabel="保存术语规则"
        onConfirm={handleAddGlossarySubmit}
        onCancel={() => setIsAddModalOpen(false)}
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              中文源词汇 (Source Text) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="例如: 踏频"
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                英语 (EN)
              </label>
              <input
                type="text"
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                placeholder="Cadence"
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-100'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                德语 (DE)
              </label>
              <input
                type="text"
                value={newDe}
                onChange={(e) => setNewDe(e.target.value)}
                placeholder="Trittfrequenz"
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-100'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                法语 (FR)
              </label>
              <input
                type="text"
                value={newFr}
                onChange={(e) => setNewFr(e.target.value)}
                placeholder="Cadence"
                className={`w-full px-2.5 py-1.5 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-100'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-rose-600 dark:text-rose-400 font-semibold mb-1">
              严禁使用的译法 / 禁用词 (英文逗号分隔)
            </label>
            <input
              type="text"
              value={newForbidden}
              onChange={(e) => setNewForbidden(e.target.value)}
              placeholder="例如: Pedal frequency, Pace"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none ${
                isDark
                  ? 'bg-slate-950 border-rose-900/50 text-rose-300'
                  : 'bg-rose-50/50 border-rose-200 text-rose-800'
              }`}
            />
          </div>

          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              术语注释
            </label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="固件码表传感器标准统一术语"
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
        </div>
      </GlossaModalV2>
    </div>
  );
};
