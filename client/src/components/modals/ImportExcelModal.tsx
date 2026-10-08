import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  Check,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { TermItem } from '../../hooks/useTermsQuery';

export interface ImportDiffSummaryItem {
  id: string;
  kw: string;
  zhCn: string;
  type: 'ADD' | 'MOD' | 'UNCHANGED';
  changes: { lang: string; oldText?: string; newText: string }[];
  selected: boolean;
}

export interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTerms: TermItem[];
  onConfirmImport: (newTerms: TermItem[], updatedTerms: TermItem[]) => void;
  theme?: 'dark' | 'light';
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  existingTerms,
  onConfirmImport,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [diffItems, setDiffItems] = useState<ImportDiffSummaryItem[]>([]);
  const [isParsed, setIsParsed] = useState(false);

  if (!isOpen) return null;

  // Simulate file reading & diff calculation
  const handleProcessFile = (file: File) => {
    setFileName(file.name);
    // Parse sample CSV or Excel rows
    const mockParsedRows = [
      {
        kw: 'KW_RADAR_APPROACH_SPEED',
        zhCn: '后方逼近车辆速度 (%d km/h)',
        en: 'Approaching vehicle speed (%d km/h)',
        de: 'Annäherungsgeschwindigkeit (%d km/h)',
        fr: 'Vitesse du véhicule approchant (%d km/h)',
      },
      {
        kw: 'KW_STOP_RIDE',
        zhCn: '结束骑行，是否保存记录？',
        en: 'End ride and save recording?',
        de: 'Fahrt beenden und aufzeichnen?',
        fr: 'Terminer le parcours et enregistrer ?',
      },
      {
        kw: 'KW_PEDAL_SMOOTHNESS',
        zhCn: '踩踏平顺度',
        en: 'Pedal Smoothness',
        de: 'Rundtritt-Gleichmäßigkeit',
        fr: 'Fluidité du pédalage',
      },
    ];

    const generatedDiffs: ImportDiffSummaryItem[] = mockParsedRows.map((row, idx) => {
      const match = existingTerms.find((t) => t.kw === row.kw);
      if (!match) {
        return {
          id: `imp-${idx}`,
          kw: row.kw,
          zhCn: row.zhCn,
          type: 'ADD',
          changes: [
            { lang: 'en', newText: row.en },
            { lang: 'de', newText: row.de },
            { lang: 'fr', newText: row.fr },
          ],
          selected: true,
        };
      }

      // Check if text changed
      const changes: { lang: string; oldText?: string; newText: string }[] = [];
      if (match.zhCn !== row.zhCn) {
        changes.push({ lang: 'zh-CN', oldText: match.zhCn, newText: row.zhCn });
      }
      if (match.translations.en?.text !== row.en) {
        changes.push({ lang: 'en', oldText: match.translations.en?.text, newText: row.en });
      }
      if (match.translations.de?.text !== row.de) {
        changes.push({ lang: 'de', oldText: match.translations.de?.text, newText: row.de });
      }

      return {
        id: `imp-${idx}`,
        kw: row.kw,
        zhCn: row.zhCn,
        type: changes.length > 0 ? 'MOD' : 'UNCHANGED',
        changes,
        selected: changes.length > 0,
      };
    });

    setDiffItems(generatedDiffs);
    setIsParsed(true);
  };

  const handleToggleSelect = (id: string) => {
    setDiffItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleCommit = () => {
    const selected = diffItems.filter((d) => d.selected);
    const addedList: TermItem[] = [];
    const updatedList: TermItem[] = [];

    selected.forEach((item) => {
      if (item.type === 'ADD') {
        addedList.push({
          id: `term-imp-${Date.now()}-${Math.random()}`,
          kw: item.kw,
          zhCn: item.zhCn,
          projectId: 'proj-c606',
          versionId: 'v2.0.0',
          maxChars: 24,
          isLocked: false,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          meta: { module: 'activity' },
          translations: {
            en: { lang: 'en', text: item.changes.find((c) => c.lang === 'en')?.newText || '', status: 'reviewed', source: 'human' },
            de: { lang: 'de', text: item.changes.find((c) => c.lang === 'de')?.newText || '', status: 'reviewed', source: 'human' },
            fr: { lang: 'fr', text: item.changes.find((c) => c.lang === 'fr')?.newText || '', status: 'reviewed', source: 'human' },
          },
        });
      } else if (item.type === 'MOD') {
        const existing = existingTerms.find((t) => t.kw === item.kw);
        if (existing) {
          const trans = { ...existing.translations };
          item.changes.forEach((c) => {
            if (c.lang !== 'zh-CN') {
              trans[c.lang] = {
                lang: c.lang,
                text: c.newText,
                status: 'reviewed',
                source: 'human',
                updatedAt: new Date().toISOString(),
              };
            }
          });
          updatedList.push({
            ...existing,
            zhCn: item.zhCn,
            translations: trans,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });

    onConfirmImport(addedList, updatedList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm select-none">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary-500/15 text-primary-500 border border-primary-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold">导入词条表格 (Excel / CSV)</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                支持外翻终稿智能归并，导入前自动执行假差异清洗与增量 Diff 预检
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg hover:bg-slate-500/10 cursor-pointer ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!isParsed ? (
            /* Upload Drop Area */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files[0];
                if (file) handleProcessFile(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary-500 bg-primary-500/10 scale-[1.01]'
                  : isDark
                  ? 'border-slate-700 hover:border-primary-500/50 hover:bg-slate-800/40'
                  : 'border-slate-300 hover:border-primary-500/50 hover:bg-slate-50'
              }`}
            >
              <UploadCloud className="w-12 h-12 text-primary-500 mb-3" />
              <p className="text-sm font-bold mb-1">
                点击选择文件 或 直接拖拽文件至此区域
              </p>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                支持标准 .xlsx 原生工作簿与 UTF-8 .csv 文件（首行包含 KW、zh-CN 及各目标语种）
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessFile(file);
                }}
              />
            </div>
          ) : (
            /* Pre-import Diff Summary Preview */
            <div className="space-y-3.5">
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 font-mono">
                  <FileText className="w-4 h-4 text-primary-500" />
                  <span className="font-bold">{fileName}</span>
                </div>
                <div className="flex items-center gap-3 font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    新增 +{diffItems.filter((d) => d.type === 'ADD').length}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400">
                    更新 ~{diffItems.filter((d) => d.type === 'MOD').length}
                  </span>
                  <button
                    onClick={() => {
                      setIsParsed(false);
                      setDiffItems([]);
                    }}
                    className="text-xs text-primary-500 hover:underline cursor-pointer"
                  >
                    重新上传
                  </button>
                </div>
              </div>

              {/* Items Diff List */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {diffItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleSelect(item.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      item.selected
                        ? isDark
                          ? 'border-primary-500/70 bg-primary-500/10'
                          : 'border-primary-500/70 bg-primary-50/70'
                        : isDark
                        ? 'border-slate-800 bg-slate-950/40 opacity-70'
                        : 'border-slate-200 bg-white opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => handleToggleSelect(item.id)}
                          className="rounded text-primary-500"
                        />
                        <span className="font-mono font-bold text-primary-600 dark:text-primary-400">
                          {item.kw}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                          item.type === 'ADD'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : item.type === 'MOD'
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-slate-500/15 text-slate-500 border-slate-500/30'
                        }`}
                      >
                        {item.type === 'ADD' ? '新增词条' : item.type === 'MOD' ? '更新译文' : '内容无变动'}
                      </span>
                    </div>

                    <p className={`mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.zhCn}
                    </p>

                    {item.changes.length > 0 && (
                      <div className="space-y-1 font-mono text-[11px] pt-1 border-t border-slate-500/20">
                        {item.changes.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="uppercase text-primary-500 font-bold">{c.lang}:</span>
                            {c.oldText && <span className="line-through opacity-60">{c.oldText}</span>}
                            <ArrowRight className="w-3 h-3 opacity-40 shrink-0" />
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{c.newText}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {isParsed ? `已勾选 ${diffItems.filter((d) => d.selected).length} 项将执行入库` : '未选择导入文件'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
            >
              取消
            </button>
            <button
              disabled={!isParsed || diffItems.filter((d) => d.selected).length === 0}
              onClick={handleCommit}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 hover:to-amber-400 text-white font-bold text-xs shadow-md shadow-primary-500/25 disabled:opacity-50 cursor-pointer active:scale-[0.98] transition-all"
            >
              确认增量同步入库
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
