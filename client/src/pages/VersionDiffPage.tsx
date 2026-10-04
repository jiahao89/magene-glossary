import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Layers,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { VersionInfo } from '../data/mock-data';

export interface VersionDiffItem {
  id: string;
  kw: string;
  changeType: 'ADD' | 'DEL' | 'MOD';
  sourceVersion: string;
  targetVersion: string;
  zhCnOld?: string;
  zhCnNew?: string;
  langDiffs: {
    lang: string;
    oldText?: string;
    newText?: string;
    isFalseDiff?: boolean;
  }[];
}

export interface VersionDiffPageProps {
  versions: VersionInfo[];
  currentVersionId: string;
  languages: string[];
  theme: 'dark' | 'light';
}

const MOCK_DIFF_ITEMS: VersionDiffItem[] = [
  {
    id: 'diff-01',
    kw: 'KW_RADAR_WARNING_VEHICLE',
    changeType: 'ADD',
    sourceVersion: 'v2.0.0',
    targetVersion: 'v1.9.0',
    zhCnNew: '后方有快速逼近车辆 (距离: %d 米)',
    langDiffs: [
      { lang: 'en', newText: 'Fast vehicle approaching (%d m)' },
      { lang: 'de', newText: 'Schnelles Fahrzeug nähert sich (%d m)' },
      { lang: 'fr', newText: 'Véhicule rapide en approche (%d m)' },
      { lang: 'es', newText: 'Vehículo aproximándose rápido (%d m)' },
      { lang: 'ja', newText: '後方接近車両あり (%d m)' },
    ],
  },
  {
    id: 'diff-02',
    kw: 'KW_STOP_RIDE',
    changeType: 'MOD',
    sourceVersion: 'v2.0.0',
    targetVersion: 'v1.9.0',
    zhCnOld: '结束',
    zhCnNew: '结束骑行，是否保存记录？',
    langDiffs: [
      {
        lang: 'de',
        oldText: 'Anhalten',
        newText: 'Fahrt beenden und speichern?',
      },
      {
        lang: 'es',
        oldText: 'Detener',
        newText: '¿Finalizar ruta y guardar?',
      },
    ],
  },
  {
    id: 'diff-03',
    kw: 'KW_OLD_BLE_LEGACY_PAIR',
    changeType: 'DEL',
    sourceVersion: 'v2.0.0',
    targetVersion: 'v1.9.0',
    zhCnOld: '旧款蓝牙外设兼容通道配对中...',
    langDiffs: [
      { lang: 'en', oldText: 'Legacy Bluetooth sensor pairing...' },
      { lang: 'de', oldText: 'Altes Bluetooth-Sensor-Koppeln...' },
    ],
  },
  {
    id: 'diff-04',
    kw: 'KW_SENSOR_DISCONNECTED',
    changeType: 'MOD',
    sourceVersion: 'v2.0.0',
    targetVersion: 'v1.9.0',
    zhCnOld: '警告："传感器已断开"，请重试\n[确认]',
    zhCnNew: '警告：传感器已断开连接，请重试',
    langDiffs: [
      {
        lang: 'en',
        oldText: 'Warning: "Sensor lost", retry\n[OK]',
        newText: 'Warning: Sensor disconnected, retry',
        isFalseDiff: false,
      },
      {
        lang: 'es',
        oldText: 'Aviso: "Sensor perdido", reintentar\n[OK]',
        newText: 'Aviso: Sensor desconectado, reintentar',
      },
    ],
  },
];

export const VersionDiffPage: React.FC<VersionDiffPageProps> = ({
  versions,
  currentVersionId,
  languages,
  theme,
}) => {
  const [sourceVersion, setSourceVersion] = useState(currentVersionId || 'v2.0.0');
  const [baseVersion, setBaseVersion] = useState('v1.9.0');
  const [filterType, setFilterType] = useState<'ALL' | 'ADD' | 'DEL' | 'MOD'>('ALL');
  const [filterLang, setFilterLang] = useState<string>('all');
  const [normalizePunctuation, setNormalizePunctuation] = useState(true);
  const [normalizeWhitespace, setNormalizeWhitespace] = useState(true);
  const [selectedDiffIds, setSelectedDiffIds] = useState<Set<string>>(new Set(['diff-01', 'diff-02']));
  const [isApplying, setIsApplying] = useState(false);

  // Filtered diff list
  const filteredDiffs = useMemo(() => {
    return MOCK_DIFF_ITEMS.filter((item) => {
      if (filterType !== 'ALL' && item.changeType !== filterType) return false;
      if (filterLang !== 'all') {
        const hasLang = item.langDiffs.some((d) => d.lang === filterLang);
        if (!hasLang) return false;
      }
      return true;
    });
  }, [filterType, filterLang]);

  // Counts
  const counts = useMemo(() => {
    return {
      total: MOCK_DIFF_ITEMS.length,
      add: MOCK_DIFF_ITEMS.filter((i) => i.changeType === 'ADD').length,
      del: MOCK_DIFF_ITEMS.filter((i) => i.changeType === 'DEL').length,
      mod: MOCK_DIFF_ITEMS.filter((i) => i.changeType === 'MOD').length,
    };
  }, []);

  const handleApplyDiff = async () => {
    if (selectedDiffIds.size === 0) return;
    setIsApplying(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      alert(`已成功将选中的 ${selectedDiffIds.size} 项变更增量合并同步至目标版本 [${baseVersion}]！已自动生成快照与审计记录。`);
      setSelectedDiffIds(new Set());
    } finally {
      setIsApplying(false);
    }
  };

  const handleExportDiffExcel = () => {
    alert(`已将 [${sourceVersion}] 对比 [${baseVersion}] 的 ${MOCK_DIFF_ITEMS.length} 条差异结果导出为 Native Excel (.xlsx)！`);
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden select-none">
      {/* ── Top Diff Comparison Configuration Toolbar ─────────────────────── */}
      <div className={`p-4 border-b flex items-center justify-between gap-4 shrink-0 ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400">对比源 (Source):</span>
            <select
              value={sourceVersion}
              onChange={(e) => setSourceVersion(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono font-bold"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.versionName} {!v.isSealed ? '(当前编辑)' : '(封板)'}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="w-4 h-4 text-slate-500" />

          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-400">基准版本 (Baseline):</span>
            <select
              value={baseVersion}
              onChange={(e) => setBaseVersion(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 font-mono font-bold"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.versionName} {v.isSealed ? '(封板基线)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          {/* False Diff Normalizer Settings */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400 flex items-center gap-1 font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-accent-400" />
              <span>智能假差异清洗:</span>
            </span>
            <label className="flex items-center gap-1 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={normalizePunctuation}
                onChange={(e) => setNormalizePunctuation(e.target.checked)}
                className="rounded border-slate-700 text-primary-500"
              />
              <span>全半角标点/引号等价</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={normalizeWhitespace}
                onChange={(e) => setNormalizeWhitespace(e.target.checked)}
                className="rounded border-slate-700 text-primary-500"
              />
              <span>首尾连续空格清洗</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {selectedDiffIds.size > 0 && (
            <button
              onClick={handleApplyDiff}
              disabled={isApplying}
              className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/20 cursor-pointer disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isApplying ? '正在增量合并...' : `应用选中变更至目标 (${selectedDiffIds.size})`}</span>
            </button>
          )}

          <button
            onClick={handleExportDiffExcel}
            className={`px-3.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>导出差异 Excel</span>
          </button>
        </div>
      </div>

      {/* ── Sub Toolbar: Change Type Counters & Language Drill-down ─────── */}
      <div className={`px-4 py-2.5 border-b flex items-center justify-between text-xs shrink-0 ${
        theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-semibold">变更类型:</span>
          {[
            { id: 'ALL', label: `全部变动 (${counts.total})` },
            { id: 'ADD', label: `🟢 新增 (${counts.add})` },
            { id: 'DEL', label: `🔴 删除 (${counts.del})` },
            { id: 'MOD', label: `🟡 修改 (${counts.mod})` },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                filterType === type.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Language Filter */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-semibold">按语种过滤:</span>
          <select
            value={filterLang}
            onChange={(e) => setFilterLang(e.target.value)}
            className="px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]"
          >
            <option value="all">全部变动语言 (All Languages)</option>
            {languages.map((l) => (
              <option key={l} value={l}>
                仅看 {l.toUpperCase()} 变动
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Diff Results Cards List ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredDiffs.map((diff) => {
          const isSelected = selectedDiffIds.has(diff.id);

          return (
            <div
              key={diff.id}
              className={`p-4 rounded-xl border transition-all ${
                isSelected
                  ? 'border-primary-500/60 bg-slate-900/90 shadow-md shadow-primary-500/5'
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      const next = new Set(selectedDiffIds);
                      if (next.has(diff.id)) next.delete(diff.id);
                      else next.add(diff.id);
                      setSelectedDiffIds(next);
                    }}
                    className="rounded border-slate-700 text-primary-500 cursor-pointer"
                  />

                  {/* Change Type Badge */}
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      diff.changeType === 'ADD'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : diff.changeType === 'DEL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}
                  >
                    {diff.changeType === 'ADD' ? '+ ADD 新增' : diff.changeType === 'DEL' ? '- DEL 删除' : '~ MOD 修改'}
                  </span>

                  <span className="font-mono font-bold text-sm text-slate-100">{diff.kw}</span>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  {diff.changeType === 'ADD' && <span className="text-emerald-400">仅在 {diff.sourceVersion} 存在</span>}
                  {diff.changeType === 'DEL' && <span className="text-rose-400">仅在 {diff.targetVersion} 存在</span>}
                  {diff.changeType === 'MOD' && <span>在两版本间存在差异</span>}
                </div>
              </div>

              {/* Chinese Benchmark Diff */}
              {(diff.zhCnOld || diff.zhCnNew) && (
                <div className="mb-3 px-3 py-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    中文基准原文 (zh-CN)
                  </div>
                  {diff.changeType === 'MOD' && diff.zhCnOld !== diff.zhCnNew ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-2 rounded bg-rose-950/20 text-rose-300 line-through">
                        {diff.zhCnOld}
                      </div>
                      <div className="p-2 rounded bg-emerald-950/20 text-emerald-300">
                        {diff.zhCnNew}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-200">{diff.zhCnNew || diff.zhCnOld}</div>
                  )}
                </div>
              )}

              {/* Multi-Language Diff Comparison */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  多语言差异明细
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  {diff.langDiffs.map((langDiff) => (
                    <div
                      key={langDiff.lang}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary-400 uppercase">
                          {langDiff.lang}
                        </span>
                        {langDiff.isFalseDiff && (
                          <span className="text-[9px] px-1 rounded bg-accent-500/20 text-accent-400">
                            已清洗标点假差异
                          </span>
                        )}
                      </div>

                      {diff.changeType === 'MOD' ? (
                        <div className="space-y-1">
                          {langDiff.oldText && (
                            <div className="p-1 rounded bg-rose-950/30 text-rose-300 line-through text-[11px]">
                              - {langDiff.oldText}
                            </div>
                          )}
                          {langDiff.newText && (
                            <div className="p-1 rounded bg-emerald-950/30 text-emerald-300 text-[11px]">
                              + {langDiff.newText}
                            </div>
                          )}
                        </div>
                      ) : diff.changeType === 'ADD' ? (
                        <div className="p-1 rounded bg-emerald-950/30 text-emerald-300 text-[11px]">
                          + {langDiff.newText}
                        </div>
                      ) : (
                        <div className="p-1 rounded bg-rose-950/30 text-rose-300 line-through text-[11px]">
                          - {langDiff.oldText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
