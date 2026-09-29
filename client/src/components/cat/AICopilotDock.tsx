import React, { useState } from 'react';

export interface TMSuggestion {
  sourceText: string;
  targetText: string;
  similarity: number; // 0 - 100%
  domain?: string;
}

export interface AICandidate {
  provider: string; // e.g. 'DeepSeek-V3', 'Claude 3.5 Sonnet'
  text: string;
  reasoningChain?: string;
  confidence: number;
}

export interface AICopilotDockProps {
  tmSuggestions: TMSuggestion[];
  aiCandidates: AICandidate[];
  isLoadingAI: boolean;
  onAdoptTM: (text: string) => void;
  onAdoptAI: (text: string) => void;
  onTriggerAIRefresh: () => void;
}

/**
 * AICopilotDock Component (TASK-701)
 * Right dock for Translation Memory (TM) and multi-provider AI assistance
 */
export const AICopilotDock: React.FC<AICopilotDockProps> = ({
  tmSuggestions,
  aiCandidates,
  isLoadingAI,
  onAdoptTM,
  onAdoptAI,
  onTriggerAIRefresh,
}) => {
  const [showCoT, setShowCoT] = useState(false);

  return (
    <div
      className="flex flex-col gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl"
      data-testid="ai-copilot-dock"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🧠</span>
          <span className="font-bold text-xs text-slate-200">AI 辅助坞与翻译记忆 (TM)</span>
        </div>
        <button
          onClick={onTriggerAIRefresh}
          disabled={isLoadingAI}
          className="text-xs px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50 flex items-center gap-1 transition-colors"
        >
          {isLoadingAI ? (
            <span className="w-3 h-3 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
          ) : (
            <span>🔄 重新生成</span>
          )}
        </button>
      </div>

      {/* Section 1: Translation Memory (TM) Matches */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">TM 记忆库匹配</span>
          <span className="text-[10px] text-slate-500">快捷键: Alt + 1</span>
        </div>

        {tmSuggestions.length === 0 ? (
          <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-950/40 text-slate-500 text-xs text-center">
            无相近记忆库匹配 (相似度 &lt; 80%)
          </div>
        ) : (
          tmSuggestions.map((tm, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col gap-1.5 transition hover:border-emerald-500/40"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                    tm.similarity >= 95
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {Math.round(tm.similarity)}% 相似度
                </span>
                <button
                  onClick={() => onAdoptTM(tm.targetText)}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400"
                >
                  采纳 (Alt+{idx + 1})
                </button>
              </div>
              <p className="text-xs text-slate-200 font-medium">{tm.targetText}</p>
              <p className="text-[11px] text-slate-500 truncate">原: {tm.sourceText}</p>
            </div>
          ))
        )}
      </div>

      {/* Section 2: AI Multi-Model Candidates */}
      <div className="flex flex-col gap-2 pt-1 border-t border-slate-800">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">AI 大模型候选</span>
          <span className="text-[10px] text-slate-500">快捷键: Alt + 2</span>
        </div>

        {isLoadingAI ? (
          <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
            <span className="w-5 h-5 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            <span>AI 网关梯队并发推理中 (DeepSeek / Claude)...</span>
          </div>
        ) : aiCandidates.length === 0 ? (
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 text-slate-500 text-xs text-center">
            点击“重新生成”获取 AI 翻译建议
          </div>
        ) : (
          aiCandidates.map((cand, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 flex flex-col gap-2 transition hover:border-primary-500/40"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-400 font-bold">
                    {cand.provider}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    置信度: {Math.round(cand.confidence * 100)}%
                  </span>
                </div>
                <button
                  onClick={() => onAdoptAI(cand.text)}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-primary-500/15 hover:bg-primary-500/25 text-primary-400"
                >
                  采纳 (Alt+{idx + 2})
                </button>
              </div>

              <p className="text-xs text-slate-100 font-medium">{cand.text}</p>

              {/* CoT Reasoning Chain Collapsible */}
              {cand.reasoningChain && (
                <div className="mt-1">
                  <button
                    onClick={() => setShowCoT(!showCoT)}
                    className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    <span>{showCoT ? '▼ 收起' : '▶ 查看'} AI 术语思考链 (CoT)</span>
                  </button>
                  {showCoT && (
                    <div className="mt-1 p-2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap">
                      {cand.reasoningChain}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
