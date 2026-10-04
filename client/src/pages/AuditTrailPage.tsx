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
    <div className="flex flex-col w-full h-full overflow-hidden select-none">
      {/* ── Top Header & Filters ───────────────────────────────────────────── */}
      <div className={`p-4 border-b flex items-center justify-between gap-4 shrink-0 ${
        theme === 'dark' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>不可变变更审计流水与时光机</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                  东八区 CST
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                精确记录字段级变更（Old vs New），任何时光机回退均自动生成“后悔药”不可变快照备份。
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* KW Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchKw}
              onChange={(e) => setSearchKw(e.target.value)}
              placeholder="按 KW 宏名过滤..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Operator Filter */}
          <select
            value={operatorFilter}
            onChange={(e) => setOperatorFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none"
          >
            <option value="all">全部操作人 (All Operators)</option>
            <option value="张工">张工 (固件研发组)</option>
            <option value="李工">李工 (本地化组)</option>
            <option value="AI">AI (DeepSeek 网关)</option>
            <option value="王组长">王组长 (系统架构师)</option>
          </select>
        </div>
      </div>

      {/* ── Audit Logs List ───────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredLogs.map((log) => {
          return (
            <div
              key={log.id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:border-slate-700 transition-all space-y-2.5"
            >
              {/* Top Meta Line */}
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>[CST {log.timestamp}]</span>
                  </span>

                  <span className="flex items-center gap-1 font-semibold text-slate-200">
                    <User className="w-3 h-3 text-primary-500" />
                    <span>{log.operator}</span>
                  </span>

                  {/* Action Badge */}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      log.action === 'UPDATE_TRANSLATION'
                        ? 'bg-amber-500/20 text-amber-400'
                        : log.action === 'AI_BATCH_TRANSLATE'
                        ? 'bg-accent-500/20 text-accent-400'
                        : log.action === 'LOCK_TERM'
                        ? 'bg-slate-700 text-slate-300'
                        : log.action === 'DIFF_MERGE'
                        ? 'bg-cyan-500/20 text-cyan-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {log.action}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-primary-400">{log.kw}</span>
                  {log.lang && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
                      {log.lang}
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedSnapshot(log)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>时光机回退</span>
                  </button>
                </div>
              </div>

              {/* Red/Green Diff View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/30 text-rose-300 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-rose-400/80">修改前 (Old Value)</div>
                  <div className="line-through">{log.oldValue || '(空)'}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 space-y-1">
                  <div className="text-[10px] font-bold uppercase text-emerald-400/80">修改后 (New Value)</div>
                  <div>{log.newValue}</div>
                </div>
              </div>

              {/* Reason / Context */}
              {log.reason && (
                <div className="text-[11px] text-slate-400 italic flex items-center gap-1.5">
                  <span className="font-semibold text-slate-500 font-sans not-italic">说明:</span>
                  <span>{log.reason}</span>
                </div>
              )}
            </div>
          );
        })}
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
        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              **核心安全保障（后悔药机制）**：系统在执行回退前，已自动把“回退前的当前最新数据”备份生成一份崭新的快照。这意味着回退动作也是一次可追溯、可二次撤销的安全行为。
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-700 space-y-1 font-mono">
            <div>目标快照: {selectedSnapshot?.id}</div>
            <div>操作时间: CST {selectedSnapshot?.timestamp}</div>
            <div>回退至内容: <span className="text-emerald-400 font-bold">{selectedSnapshot?.oldValue}</span></div>
          </div>
        </div>
      </GlossaModalV2>
    </div>
  );
};
