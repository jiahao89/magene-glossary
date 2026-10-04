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
  ArrowRight
} from 'lucide-react';
import { GlossaryTerm, INITIAL_GLOSSARY_TERMS } from '../data/mock-data';
import { GlossaModalV2 } from '../components/common/GlossaModalV2';

export interface GlossaryTmPageProps {
  theme: 'dark' | 'light';
}

export const GlossaryTmPage: React.FC<GlossaryTmPageProps> = ({ theme }) => {
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

  return (
    <div className="flex flex-col w-full h-full overflow-hidden select-none">
      {/* ── Top Header Toolbar ─────────────────────────────────────────────── */}
      <div className={`p-4 border-b flex items-center justify-between gap-4 shrink-0 ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('glossary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'glossary'
                  ? 'bg-primary-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>统一术语库 (Glossary)</span>
            </button>
            <button
              onClick={() => setActiveTab('tm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'tm'
                  ? 'bg-primary-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>向量记忆库 (Translation Memory)</span>
            </button>
          </div>
        </div>

        {activeTab === 'glossary' && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/20 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>添加规范术语</span>
          </button>
        )}
      </div>

      {/* ── Main View Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'glossary' ? (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                迈金科技官方术语库：强制注入直连 AI 提示词与译员辅助工作台，严格防范禁用词。
              </span>
              <span className="font-mono text-slate-500">共收录 {glossaryTerms.length} 组核心业务术语</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {glossaryTerms.map((term) => (
                <div
                  key={term.id}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-slate-100">{term.sourceText}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {term.domain}
                      </span>
                    </div>
                  </div>

                  {/* Standard Translations */}
                  <div className="space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      标准规范译文
                    </div>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      {Object.entries(term.translations).map(([lang, text]) => (
                        <div key={lang} className="px-2 py-1 rounded bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
                          <span className="text-primary-400 uppercase font-bold text-[11px]">{lang}:</span>
                          <span className="text-slate-200">{text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Forbidden Words */}
                  {term.forbiddenWords.length > 0 && (
                    <div className="text-xs space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        <span>严禁使用词汇 (Forbidden)</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {term.forbiddenWords.map((w) => (
                          <span key={w} className="px-2 py-0.5 rounded bg-rose-950/30 text-rose-300 border border-rose-900/40 text-[11px] line-through font-mono">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {term.notes && (
                    <p className="text-[11px] text-slate-400 italic">
                      规则注释: {term.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* TM Vector View */
          <div className="space-y-4 max-w-4xl">
            {/* TM Overview Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="text-[11px] font-bold text-slate-400 uppercase">向量化 TM 语料库</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">2,840 条</div>
                <p className="text-[11px] text-slate-500 mt-1">PostgreSQL pgvector 预置索引</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="text-[11px] font-bold text-slate-400 uppercase">100% 精确匹配速度</div>
                <div className="text-2xl font-bold font-mono text-primary-400 mt-1">&lt; 18 ms</div>
                <p className="text-[11px] text-slate-500 mt-1">0 API 成本，本地直接极速返回</p>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="text-[11px] font-bold text-slate-400 uppercase">历史命中覆盖率</div>
                <div className="text-2xl font-bold font-mono text-accent-400 mt-1">68.4%</div>
                <p className="text-[11px] text-slate-500 mt-1">有效缩短 70% 批量翻译总耗时</p>
              </div>
            </div>

            {/* Interactive Vector Search Simulator */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent-400" />
                  <span>TM 相似度向量检索实时体验</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  输入任意中文文本，模拟测试 pgvector 余弦相似度召回与 100% 精确直通
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={tmTestInput}
                  onChange={(e) => setTmTestInput(e.target.value)}
                  placeholder="输入中文原文测试 TM..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  onClick={handleTestTM}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  检索记忆库
                </button>
              </div>

              {tmMatchResult && (
                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-emerald-500/30 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>余弦相似度: {tmMatchResult.similarity}% ({tmMatchResult.matchType})</span>
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      检索耗时: {tmMatchResult.latencyMs} ms
                    </span>
                  </div>
                  <div className="font-mono text-slate-200 p-2 rounded bg-slate-900 border border-slate-800">
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
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              中文源词汇 (Source Text) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="例如: 踏频"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">英语 (EN)</label>
              <input
                type="text"
                value={newEn}
                onChange={(e) => setNewEn(e.target.value)}
                placeholder="Cadence"
                className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">德语 (DE)</label>
              <input
                type="text"
                value={newDe}
                onChange={(e) => setNewDe(e.target.value)}
                placeholder="Trittfrequenz"
                className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">法语 (FR)</label>
              <input
                type="text"
                value={newFr}
                onChange={(e) => setNewFr(e.target.value)}
                placeholder="Cadence"
                className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-rose-400 font-semibold mb-1">
              严禁使用的译法 / 禁用词 (英文逗号分隔)
            </label>
            <input
              type="text"
              value={newForbidden}
              onChange={(e) => setNewForbidden(e.target.value)}
              placeholder="例如: Pedal frequency, Pace"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-900/50 text-rose-200 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">术语注释</label>
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="固件码表传感器标准统一术语"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none"
            />
          </div>
        </div>
      </GlossaModalV2>
    </div>
  );
};
