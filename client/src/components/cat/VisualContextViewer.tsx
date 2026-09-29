import React, { useState } from 'react';

export interface HotspotBox {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  width: number; // percentage 0 - 100
  height: number; // percentage 0 - 100
  label?: string;
}

export interface VisualContextViewerProps {
  imageUrl?: string | null;
  hotspot?: HotspotBox | null;
  kw: string;
}

/**
 * VisualContextViewer (TASK-703)
 * Displays real device screenshots with bounding hotspot highlighting
 * Helps translators visualize physical layout location without blind translation.
 */
export const VisualContextViewer: React.FC<VisualContextViewerProps> = ({
  imageUrl,
  hotspot,
  kw,
}) => {
  const [zoom, setZoom] = useState(1);

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-700/60 rounded-xl bg-slate-900/30 text-slate-500 text-xs">
        <span className="text-2xl mb-1">📷</span>
        <span>该词条尚未绑定真机 UI 截图</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold text-slate-300">真机界面热区映射</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
          >
            -
          </button>
          <span className="font-mono text-[11px] w-12 text-center text-slate-400">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.2))}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
          >
            +
          </button>
        </div>
      </div>

      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-lg bg-black border border-slate-800 flex items-center justify-center">
        <div
          className="relative transition-transform duration-200 origin-center"
          style={{ transform: `scale(${zoom})` }}
        >
          <img
            src={imageUrl}
            alt={`Device Screenshot for ${kw}`}
            className="max-h-[220px] w-auto object-contain select-none pointer-events-none"
          />

          {/* Glowing Hotspot Overlay Box */}
          {hotspot && (
            <div
              className="absolute border-2 border-primary-500 bg-primary-500/20 rounded shadow-[0_0_12px_rgba(249,115,22,0.6)] animate-pulse"
              style={{
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                width: `${hotspot.width}%`,
                height: `${hotspot.height}%`,
              }}
            >
              <span className="absolute -top-5 left-0 px-1 py-0.2 bg-primary-500 text-white font-mono text-[9px] font-bold rounded shadow-xs whitespace-nowrap">
                {hotspot.label || kw}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
