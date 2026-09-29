import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './stores/query-client';
import { CatStudioPage } from './pages/CatStudioPage';
import { TermItem } from './hooks/useTermsQuery';

// 迈金 C606 智能码表真实业务词条模拟数据
const MOCK_C606_TERMS: TermItem[] = [
  {
    id: 'term-001',
    projectId: 'proj-c606',
    versionId: 'v2.0.0',
    kw: 'KW_RIDE_START',
    zhCn: '开始骑行',
    comment: '启动骑行运动记录按钮，显示于码表主屏幕底部状态栏',
    maxChars: 12,
    isLocked: false,
    status: 'active',
    createdAt: '2026-09-28T08:00:00Z',
    updatedAt: '2026-09-28T10:15:00Z',
    meta: { module: 'activity' },
    translations: {
      en: { lang: 'en', text: 'Start Ride', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:00:00Z' },
      de: { lang: 'de', text: 'Fahrt starten', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:05:00Z' },
      fr: { lang: 'fr', text: 'Démarrer sortie', status: 'reviewed', source: 'ai', updatedAt: '2026-09-28T10:08:00Z' },
      es: { lang: 'es', text: 'Iniciar ruta', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:12:00Z' },
      ja: { lang: 'ja', text: 'ライド開始', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:15:00Z' },
    },
  },
  {
    id: 'term-002',
    projectId: 'proj-c606',
    versionId: 'v2.0.0',
    kw: 'KW_HEART_RATE_BPM',
    zhCn: '心率 (BPM)',
    comment: '实时心率数据显示格，超过阈值时触发红色闪烁报警',
    maxChars: 14,
    isLocked: false,
    status: 'active',
    createdAt: '2026-09-28T08:00:00Z',
    updatedAt: '2026-09-28T10:15:00Z',
    meta: { module: 'sensor' },
    translations: {
      en: { lang: 'en', text: 'Heart Rate', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:00:00Z' },
      de: { lang: 'de', text: 'Herzfrequenz', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:05:00Z' },
      fr: { lang: 'fr', text: 'Fréq. card.', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:08:00Z' },
      es: { lang: 'es', text: 'Ritmo cardíaco', status: 'draft', source: 'ai', updatedAt: '2026-09-28T10:12:00Z' },
      ja: { lang: 'ja', text: '心拍数', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:15:00Z' },
    },
  },
  {
    id: 'term-003',
    projectId: 'proj-c606',
    versionId: 'v2.0.0',
    kw: 'KW_POWER_CALIBRATION',
    zhCn: '功率计校准中，请保持曲柄静止垂直...',
    comment: '外设功率计零点偏移自动校准弹窗提示',
    maxChars: 36,
    isLocked: false,
    status: 'active',
    createdAt: '2026-09-28T08:00:00Z',
    updatedAt: '2026-09-28T10:15:00Z',
    meta: { module: 'calibration' },
    translations: {
      en: { lang: 'en', text: 'Calibrating power meter, hold cranks still...', status: 'draft', source: 'ai', updatedAt: '2026-09-28T10:00:00Z' },
      de: { lang: 'de', text: 'Kalibrierung läuft, Kurbeln ruhig halten...', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:05:00Z' },
      fr: { lang: 'fr', text: 'Étalonnage en cours, manivelles immobiles...', status: 'draft', source: 'ai', updatedAt: '2026-09-28T10:08:00Z' },
      ja: { lang: 'ja', text: 'パワーメーター校正中、クランクを静止してください', status: 'draft', source: 'ai', updatedAt: '2026-09-28T10:15:00Z' },
    },
  },
  {
    id: 'term-004',
    projectId: 'proj-c606',
    versionId: 'v2.0.0',
    kw: 'KW_SENSOR_DISCONNECTED',
    zhCn: '警告："传感器已断开"，请重试\n[确认]',
    comment: '蓝牙/ANT+ 外设失联弹出提示对话框',
    maxChars: 30,
    isLocked: false,
    status: 'active',
    createdAt: '2026-09-28T08:00:00Z',
    updatedAt: '2026-09-28T10:15:00Z',
    meta: { module: 'alert' },
    translations: {
      en: { lang: 'en', text: 'Warning: "Sensor lost", retry\n[OK]', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:00:00Z' },
      de: { lang: 'de', text: 'Warnung: "Sensor weg", retry\n[OK]', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:05:00Z' },
      es: { lang: 'es', text: 'Aviso: "Sensor perdido", reintentar\n[OK]', status: 'draft', source: 'ai', updatedAt: '2026-09-28T10:12:00Z' },
    },
  },
  {
    id: 'term-005',
    projectId: 'proj-c606',
    versionId: 'v2.0.0',
    kw: 'KW_ELEVATION_GAIN',
    zhCn: '累计爬升',
    comment: '海拔与气压计累计爬升高度统计卡片',
    maxChars: 12,
    isLocked: true,
    status: 'active',
    createdAt: '2026-09-28T08:00:00Z',
    updatedAt: '2026-09-28T10:15:00Z',
    meta: { module: 'map' },
    translations: {
      en: { lang: 'en', text: 'Total Ascent', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:00:00Z' },
      de: { lang: 'de', text: 'Gesamtanstieg', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:05:00Z' },
      fr: { lang: 'fr', text: 'Dénivelé +', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:08:00Z' },
      es: { lang: 'es', text: 'Desnivel +', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:12:00Z' },
      ja: { lang: 'ja', text: '獲得標高', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:15:00Z' },
    },
  },
  {
    id: 'term-006',
    projectId: 'proj-c606',
    versionId: 'v2.0.0',
    kw: 'KW_NAV_TURN_LEFT',
    zhCn: '200米后左转进入环岛',
    comment: '导航路口转弯指引HUD弹窗',
    maxChars: 24,
    isLocked: false,
    status: 'active',
    createdAt: '2026-09-28T08:00:00Z',
    updatedAt: '2026-09-28T10:15:00Z',
    meta: { module: 'navigation' },
    translations: {
      en: { lang: 'en', text: 'Turn left in 200m at roundabout', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:00:00Z' },
      de: { lang: 'de', text: 'In 200m links in Kreisverkehr', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:05:00Z' },
      fr: { lang: 'fr', text: 'À 200m tourner à gauche rond-point', status: 'draft', source: 'ai', updatedAt: '2026-09-28T10:08:00Z' },
      ja: { lang: 'ja', text: '200m先ラウンドアバウト左折', status: 'reviewed', source: 'human', updatedAt: '2026-09-28T10:15:00Z' },
    },
  },
];

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(nextTheme);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className={`app-root ${theme} w-screen h-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100`}>
        {/* Global Dev Header */}
        <header className="h-11 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 z-40 select-none">
          <div className="flex items-center gap-3">
            <span className="text-primary-500 font-bold text-base tracking-wider flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-primary-500 inline-block animate-pulse"></span>
              GlossaHub v2.0
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              Magene C606 Firmware Studio
            </span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/40 text-emerald-400 font-mono border border-emerald-800/40">
              Preview Mode
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{theme === 'dark' ? '🌙 暗黑主题' : '☀️ 明亮主题'}</span>
            </button>
            <a
              href="https://github.com/jiahao89/magene-glossary"
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2.5 py-1 rounded bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors no-underline"
            >
              GitHub 仓库
            </a>
          </div>
        </header>

        {/* Studio Workspace */}
        <main className="flex-1 overflow-hidden">
          <CatStudioPage initialTerms={MOCK_C606_TERMS} />
        </main>
      </div>
    </QueryClientProvider>
  );
};
