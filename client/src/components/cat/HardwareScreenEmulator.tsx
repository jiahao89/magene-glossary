import React from 'react';

export interface HardwareScreenEmulatorProps {
  mode: 'lcd' | 'oled';
  text: string;
  kw: string;
  onToggleMode: (newMode: 'lcd' | 'oled') => void;
}

/**
 * HardwareScreenEmulator (TASK-703)
 * Simulates Magene C606 2.4-inch dot-matrix LCD (#1c261e + #6ee7b7) and OLED (#000 + white)
 */
export const HardwareScreenEmulator: React.FC<HardwareScreenEmulatorProps> = ({
  mode,
  text,
  kw,
  onToggleMode,
}) => {
  const isLcd = mode === 'lcd';

  return (
    <div
      className="flex flex-col gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl"
      data-testid="hardware-screen-emulator"
    >
      {/* Top Header & Switcher */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold text-slate-300">C606 物理硬件拟真视窗</span>
        </div>
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          <button
            onClick={() => onToggleMode('lcd')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              isLcd ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            LCD 点阵
          </button>
          <button
            onClick={() => onToggleMode('oled')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              !isLcd ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            OLED 纯黑
          </button>
        </div>
      </div>

      {/* Hardware C606 Device Bezel Simulation */}
      <div className="relative mx-auto w-full max-w-[340px] aspect-[4/3] p-4 bg-gradient-to-b from-neutral-800 to-neutral-900 rounded-2xl shadow-xl border-4 border-neutral-700 flex flex-col justify-between select-none">
        {/* Magene Logo on Top Bezel */}
        <div className="text-center text-[10px] tracking-widest text-neutral-500 font-bold uppercase">
          MAGENE
        </div>

        {/* Display Panel */}
        <div
          className={`relative w-full h-[140px] rounded-lg p-3 flex flex-col justify-between overflow-hidden shadow-inner border ${
            isLcd
              ? 'bg-[#1c261e] border-emerald-950 text-[#6ee7b7] font-mono'
              : 'bg-black border-neutral-900 text-white font-sans'
          }`}
          style={{
            backgroundImage: isLcd
              ? 'radial-gradient(rgba(110, 231, 183, 0.15) 1px, transparent 1px)'
              : 'none',
            backgroundSize: isLcd ? '4px 4px' : 'auto',
          }}
        >
          {/* Status Bar */}
          <div className="flex items-center justify-between text-[10px] opacity-75 border-b border-current/20 pb-1">
            <span>GPS ▰▰▰</span>
            <span className="text-[9px] truncate max-w-[120px]">{kw}</span>
            <span>10:42 🔋92%</span>
          </div>

          {/* Main Simulated Typography Center */}
          <div className="my-auto text-center px-2 py-1">
            <p
              className={`text-sm tracking-wide break-words line-clamp-3 ${
                isLcd
                  ? 'font-mono text-[#6ee7b7] drop-shadow-[0_0_4px_rgba(110,231,183,0.6)]'
                  : 'font-semibold text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.4)]'
              }`}
            >
              {text || '（等待译文输入...）'}
            </p>
          </div>

          {/* Bottom Alert Bar */}
          <div className="flex justify-between text-[9px] opacity-60 pt-1 border-t border-current/20">
            <span>ZONE 3 168W</span>
            <span>CAD 88</span>
          </div>
        </div>

        {/* Hardware Bottom Buttons */}
        <div className="flex justify-around items-center pt-2">
          <div className="w-8 h-1.5 bg-neutral-600 rounded-full" />
          <div className="w-8 h-1.5 bg-neutral-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
