import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  Lock,
  User,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { AuditLogEntry, MOCK_AUDIT_LOGS } from '../data/mock-data';
import { GlossaModalV2 } from '../components/common/GlossaModalV2';

export interface AuditTrailPageProps {
  theme: 'dark' | 'light';
}

export const AuditTrailPage: React.FC<AuditTrailPageProps> = ({ theme }) => {
  const isDark = theme === 'dark';
  const [logs, setLogs] = useState<AuditLogEntry[]>(MOCK_AUDIT_LOGS);
  const [searchKw, setSearchKw] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all');
  const [selectedSnapshot, setSelectedSnapshot] = useState<AuditLogEntry | null>(null);
  const [isRollbackPending, setIsRollbackPending] = useState(false);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (searchKw && !log.kw.toLowerCase().includes(searchKw.toLowerCase())) return false;
      if (operatorFilter !== 'all' && !log.operator.includes(operatorFilter)) return false;
      return true;
    });
  }, [logs, searchKw, operatorFilter]);

  // Execute Time Machine Rollback
  const handleConfirmRollback = async () => {
    if (!selectedSnapshot) return;
    setIsRollbackPending(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      // Prepend a new safety regret log
      const safetyLog: AuditLogEntry = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
        operator: '张工 (固件研发组)',
        kw: selectedSnapshot.kw,
        action: 'ROLLBACK',
        lang: selectedSnapshot.lang,
        oldValue: selectedSnapshot.newValue,
        newValue: selectedSnapshot.oldValue,
        reason: `[后悔药安全备份] 已成功时光机回退至快照 [${selectedSnapshot.id}]`,
      };
      setLogs([safetyLog, ...logs]);
      setSelectedSnapshot(null);
      alert(`已成功恢复至历史节点！系统在回退前已自动对“回退前状态”生成后悔药备份。`);
    } finally {
      setIsRollbackPending(false);
    }
  };

  return (
    <div
      className={`flex flex-col w-full h-full overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ── Top Header & Filters (HeroUI Elevated Header) ─────────────────── */}
      <div
        className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 transition-colors duration-200 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span className={isDark ? 'text-slate-100' : 'text-slate-900'}>
                不可变变更审计流水与时光机
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold border border-emerald-500/30">
                东八区 CST
              </span>
            </h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              精确记录字段级变更（Old vs New），任何时光机回退均自动生成“后悔药”不可变快照备份。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* KW Search */}
          <div className="relative min-w-[220px]">
            <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
              placeholder="按 KW 宏名过滤..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-primary-500'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-primary-500 shadow-2xs'
              }`}
            />
          </div>

          {/* Operator Filter */}
          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/40 cursor-pointer ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-800 shadow-2xs'
            }`}
          >
            <option value="all">全部操作人 (All Operators)</option>
            <option value="张工">张工 (固件研发组)</option>
            <option value="李工">李工 (本地化组)</option>
            <option value="AI">AI (DeepSeek 网关)</option>
            <option value="王组长">王组长 (系统架构师)</option>
          </select>
        </div>
      </div>

      {/* ── Audit Logs List (HeroUI Timeline Cards) ───────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
        {filteredLogs.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            没有匹配的审计日志记录
          </div>
        ) : (
          filteredLogs.map((log) => {
            return (
              <div
                key={log.id}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700'
                    : 'bg-white border-slate-200/90 hover:border-primary-400/50 shadow-xs'
                }`}
              >
                {/* Top Meta Line */}
                <div
                  className={`flex flex-wrap items-center justify-between text-xs pb-2.5 border-b ${
                    isDark ? 'border-slate-800/80' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-medium flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      <span>[CST {log.timestamp}]</span>
                    </span>

                    <span className={`flex items-center gap-1 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      <User className="w-3.5 h-3.5 text-primary-500" />
                      <span>{log.operator}</span>
                    </span>

                    {/* Action Badge */}
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                        log.action === 'UPDATE_TRANSLATION'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : log.action === 'AI_BATCH_TRANSLATE'
                          ? 'bg-accent-500/15 text-accent-600 dark:text-accent-400 border-accent-500/30'
                          : log.action === 'LOCK_TERM'
                          ? isDark
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                          : log.action === 'DIFF_MERGE'
                          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {log.action}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-primary-600 dark:text-primary-400">
                      {log.kw}
                    </span>
                    {log.lang && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono uppercase font-bold border ${
                          isDark
                            ? 'bg-slate-800 text-slate-300 border-slate-700'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {log.lang}
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedSnapshot(log)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-primary-600 text-slate-200 hover:text-white border border-slate-700'
                          : 'bg-slate-100 hover:bg-primary-600 text-slate-700 hover:text-white border border-slate-200 shadow-2xs'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>时光机回退</span>
                    </button>
                  </div>
                </div>

                {/* Red/Green Diff View (High Contrast) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div
                    className={`p-3 rounded-xl border space-y-1 ${
                      isDark
                        ? 'bg-rose-950/25 border-rose-900/40 text-rose-300'
                        : 'bg-rose-50/80 border-rose-200 text-rose-800'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      修改前 (Old Value)
                    </div>
                    <div className="line-through leading-relaxed font-sans">{log.oldValue || '(空)'}</div>
                  </div>
                  <div
                    className={`p-3 rounded-xl border space-y-1 ${
                      isDark
                        ? 'bg-emerald-950/25 border-emerald-900/40 text-emerald-300'
                        : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      修改后 (New Value)
                    </div>
                    <div className="leading-relaxed font-sans font-medium">{log.newValue}</div>
                  </div>
                </div>

                {/* Reason / Context */}
                {log.reason && (
                  <div className={`text-xs italic flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    <span className="font-semibold not-italic text-slate-600 dark:text-slate-400">说明:</span>
                    <span>{log.reason}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Regret-Safety Time-Machine Rollback Modal ──────────────────────── */}
      <GlossaModalV2
        isOpen={Boolean(selectedSnapshot)}
        title="确认时光机快照回退"
        description={`您即将把词条 [${selectedSnapshot?.kw}] 回退至快照节点`}
        isPending={isRollbackPending}
        confirmLabel="确认并自动备份后悔药"
        onConfirm={handleConfirmRollback}
        onCancel={() => setSelectedSnapshot(null)}
      >
        <div className="space-y-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p className="leading-relaxed font-medium">
              <strong>核心安全保障（后悔药机制）</strong>：系统在执行回退前，已自动把“回退前的当前最新数据”备份生成一份崭新的快照。这意味着回退动作也是一次可追溯、可二次撤销的安全行为。
            </p>
          </div>

          <div
            className={`p-3.5 rounded-xl border space-y-1.5 font-mono ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div>目标快照: <span className="font-bold">{selectedSnapshot?.id}</span></div>
            <div>操作时间: CST {selectedSnapshot?.timestamp}</div>
            <div>
              回退至内容:{' '}
              <span className="text-emerald-600 dark:text-emerald-400 font-bold font-sans">
                {selectedSnapshot?.oldValue}
              </span>
            </div>
          </div>
        </div>
      </GlossaModalV2>
    </div>
  );
};
