import React, { useEffect, useRef } from 'react';

export interface GlossaModalV2Props {
  isOpen: boolean;
  title: string;
  description?: string;
  isPending?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

/**
 * GlossaModalV2 (TASK-704)
 * Hardened safety modal with built-in regret safety alert,
 * focus trap, and background scroll lock.
 */
export const GlossaModalV2: React.FC<GlossaModalV2Props> = ({
  isOpen,
  title,
  description,
  isPending = false,
  confirmLabel = '确认执行',
  cancelLabel = '取消',
  onConfirm,
  onCancel,
  children,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus trap & ESC handler
  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus confirm button
    confirmBtnRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isPending) {
        onCancel();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isPending, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm select-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossa-modal-title"
      data-testid="glossa-modal-v2"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
          <div>
            <h3
              id="glossa-modal-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2"
            >
              <span>🛡️</span>
              <span>{title}</span>
            </h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
            )}
          </div>
          {!isPending && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-md"
              aria-label="关闭"
            >
              ✕
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 flex flex-col gap-3">
          {/* Regret Backup Guarantee Callout Banner */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5">
            <span className="text-emerald-500 text-base leading-none">💊</span>
            <div className="text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold block mb-0.5">双向后悔药保障机制已激活</span>
              <p className="opacity-90 leading-relaxed">
                系统将在执行覆盖前，自动备份一份当前最新数据的独立快照（ROLLBACK_BACKUP）。若后续发现误操作，可随时在时光机中一键恢复。
              </p>
            </div>
          </div>

          {children}
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            disabled={isPending}
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-500 hover:bg-primary-600 text-white shadow-md shadow-primary-500/20 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>执行中...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
