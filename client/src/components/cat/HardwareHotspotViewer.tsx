import React from 'react';
import { Eye, Smartphone, Zap } from 'lucide-react';

export interface ScreenHotspot {
  id: string;
  kw: string;
  label: string;
  bbox: {
    x: number;      // 0.0 ~ 1.0 (left percent)
    y: number;      // 0.0 ~ 1.0 (top percent)
    width: number;  // 0.0 ~ 1.0
    height: number; // 0.0 ~ 1.0
  };
  uiContext: 'status_bar' | 'hud_metric' | 'dialog_alert' | 'bottom_sheet';
}

export const C606_DEFAULT_HOTSPOTS: ScreenHotspot[] = [
  {
    id: 'hs-1',
    kw: 'KW_BATTERY_LOW',
    label: '顶部状态栏 - 电量告警',
    bbox: { x: 0.05, y: 0.03, width: 0.9, height: 0.08 },
    uiContext: 'status_bar',
  },
  {
    id: 'hs-2',
    kw: 'KW_AVG_SPEED',
    label: '主表盘数据槽 1 (平均速度)',
    bbox: { x: 0.08, y: 0.16, width: 0.4, height: 0.22 },
    uiContext: 'hud_metric',
  },
  {
    id: 'hs-3',
    kw: 'KW_HEART_RATE',
    label: '主表盘数据槽 2 (当前心率)',
    bbox: { x: 0.52, y: 0.16, width: 0.4, height: 0.22 },
    uiContext: 'hud_metric',
  },
  {
    id: 'hs-4',
    kw: 'KW_CADENCE',
    label: '主表盘数据槽 3 (当前踏频)',
    bbox: { x: 0.08, y: 0.42, width: 0.4, height: 0.22 },
    uiContext: 'hud_metric',
  },
  {
    id: 'hs-5',
    kw: 'KW_STOP_RIDE',
    label: '底部骑行结束弹窗确认',
    bbox: { x: 0.06, y: 0.72, width: 0.88, height: 0.23 },
    uiContext: 'dialog_alert',
  },
  {
    id: 'hs-6',
    kw: 'KW_RADAR_WARNING_VEHICLE',
    label: '侧边雷达后方逼近告警光带',
    bbox: { x: 0.92, y: 0.15, width: 0.06, height: 0.7 },
    uiContext: 'dialog_alert',
  },
];

export interface HardwareHotspotViewerProps {
  activeKw?: string;
  onSelectKw?: (kw: string) => void;
  activeTranslationText?: string;
  theme?: 'dark' | 'light';
}

export const HardwareHotspotViewer: React.FC<HardwareHotspotViewerProps> = ({
  activeKw,
  onSelectKw,
  activeTranslationText,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col items-center select-none transition-colors ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
      }`}
    >
      <div className="w-full flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-1.5 font-bold">
          <Smartphone className="w-4 h-4 text-primary-500" />
          <span>迈金 C606 2.4" 屏幕热区联动视窗</span>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
          isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}>
          SVG 归一化矩形映射 (TASK-1101)
        </span>
      </div>

      {/* Bike Computer Outer Bezel Mockup */}
      <div className="relative w-64 h-88 bg-slate-950 rounded-4xl p-3 border-4 border-slate-800 shadow-2xl flex flex-col justify-between">
        {/* Top Magene Brand Logo */}
        <div className="text-center text-[9px] tracking-widest font-mono text-slate-500 font-bold uppercase pt-0.5">
          MAGENE • C606
        </div>

        {/* Inner LCD / OLED Display Screen (240 x 400 Resolution Ratio) */}
        <div className="relative flex-1 bg-black rounded-2xl overflow-hidden border border-slate-800/80">
          {/* Subtle Grid Dot Matrix Background */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#6ee7b7 1px, transparent 1px)',
              backgroundSize: '8px 8px',
            }}
          />

          {/* SVG Hotspots Layer */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {C606_DEFAULT_HOTSPOTS.map((hs) => {
              const isActive = hs.kw === activeKw;
              return (
                <rect
                  key={hs.id}
                  x={`${hs.bbox.x * 100}%`}
                  y={`${hs.bbox.y * 100}%`}
                  width={`${hs.bbox.width * 100}%`}
                  height={`${hs.bbox.height * 100}%`}
                  rx="4"
                  className={`pointer-events-auto cursor-pointer transition-all ${
                    isActive
                      ? 'fill-primary-500/30 stroke-primary-400 stroke-2 animate-pulse'
                      : 'fill-emerald-500/10 stroke-emerald-500/40 stroke-1 hover:fill-emerald-500/25'
                  }`}
                  onClick={() => onSelectKw?.(hs.kw)}
                />
              );
            })}
          </svg>

          {/* Screen Content Mockup */}
          <div className="absolute inset-0 p-2 flex flex-col justify-between pointer-events-none text-emerald-400 font-mono">
            {/* Status Bar */}
            <div className="flex justify-between items-center text-[10px] pb-1 border-b border-emerald-900/40">
              <span>09:42</span>
              <span>GPS • 84%</span>
            </div>

            {/* Metrics HUD */}
            <div className="space-y-2 py-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[9px] text-emerald-600">SPD km/h</span>
                <span className="text-lg font-bold text-emerald-300">32.8</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[9px] text-emerald-600">HR bpm</span>
                <span className="text-lg font-bold text-rose-400">156</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-[9px] text-emerald-600">CAD rpm</span>
                <span className="text-lg font-bold text-amber-300">92</span>
              </div>
            </div>

            {/* Active Highlight Banner */}
            {activeKw && (
              <div className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-[10px] space-y-0.5">
                <div className="text-[8px] text-emerald-500 truncate font-bold">{activeKw}</div>
                <div className="text-white text-[10px] truncate font-sans">
                  {activeTranslationText || '当前选中词条'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Hardware Buttons */}
        <div className="flex justify-around pt-1 text-[8px] text-slate-600 font-mono">
          <span>[LAP]</span>
          <span>[START/STOP]</span>
        </div>
      </div>

      <p className={`text-[11px] mt-2.5 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        点击屏幕上任意热区虚线框，可快速自动聚焦对应词条
      </p>
    </div>
  );
};
