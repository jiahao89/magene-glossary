import React, { useState, useEffect } from 'react';

export interface CellInputOverlayProps {
  isOpen: boolean;
  termKw: string;
  lang: string;
  initialValue: string;
  maxChars?: number | null;
  onCommit: (newVal: string) => void;
  onClose: () => void;
}

/**
 * CellInputOverlay for deep, expanded editing of a cell
 * Supports multi-line inspection and immediate character limit check
 */
export const CellInputOverlay: React.FC<CellInputOverlayProps> = ({
  isOpen,
  termKw,
  lang,
  initialValue,
  maxChars,
  onCommit,
  onClose,
}) => {
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  if (!isOpen) return null;

  const currentLength = val.length;
  const isOverflow = Boolean(maxChars && currentLength > maxChars);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-primary-600 dark:text-primary-400">
              {termKw}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase">
              {lang}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm"
          >
            ✕
          </button>
        </div>

        <textarea
          autoFocus
          rows={4}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className={`w-full bg-slate-50 dark:bg-slate-950 border ${
            isOverflow
              ? 'border-rose-500 focus:ring-rose-500'
              : 'border-slate-300 dark:border-slate-700 focus:ring-primary-500'
          } rounded-lg p-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 resize-none font-sans`}
          placeholder={`输入 ${lang} 完整译文...`}
        />

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {maxChars && (
              <span
                className={`text-xs font-mono font-medium ${
                  isOverflow ? 'text-rose-500 font-bold' : 'text-slate-400'
                }`}
              >
                {currentLength} / {maxChars}
                {isOverflow && ` (⚠️ 溢出 ${currentLength - maxChars})`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              onClick={() => {
                onCommit(val);
                onClose();
              }}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-500 text-white hover:bg-primary-600 shadow-sm"
            >
              确认修改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
