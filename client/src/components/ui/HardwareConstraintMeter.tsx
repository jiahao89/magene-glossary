import React from 'react';

export interface HardwareConstraintMeterProps {
  currentLength: number;
  maxChars?: number | null;
}

/**
 * HardwareConstraintMeter (TASK-702)
 * Dynamic 3-color gauge indicator for hardware display constraints.
 * Safe (<70% emerald), Warning (70-100% amber), Overflow (>100% rose with pulse glow).
 */
export const HardwareConstraintMeter: React.FC<HardwareConstraintMeterProps> = ({
  currentLength,
  maxChars,
}) => {
  if (!maxChars || maxChars <= 0) return null;

  const percentage = Math.min(Math.round((currentLength / maxChars) * 100), 150);
  const isOverflow = currentLength > maxChars;
  const isWarning = percentage >= 70 && !isOverflow;

  const colorClass = isOverflow
    ? 'bg-rose-500'
    : isWarning
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const textClass = isOverflow
    ? 'text-rose-500 dark:text-rose-400 font-bold'
    : isWarning
    ? 'text-amber-500 dark:text-amber-400 font-medium'
    : 'text-slate-500 dark:text-slate-400';

  return (
    <div
      className="flex items-center gap-2 mt-1.5 select-none"
      data-testid="hardware-constraint-meter"
      aria-label="硬件字符上限刻度指示"
    >
      {/* Visual Progress Bar Gauge */}
      <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
        <div
          className={`h-full transition-all duration-300 rounded-full ${colorClass} ${
            isOverflow ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Numerical Counter & Status */}
      <span className={`text-xs font-mono ${textClass}`}>
        {currentLength} / {maxChars} 字符
        {isOverflow && (
          <span className="ml-1 text-[11px] font-bold text-rose-500 dark:text-rose-400">
            (⚠️ 溢出 {currentLength - maxChars})
          </span>
        )}
      </span>
    </div>
  );
};
