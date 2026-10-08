import React, { useState } from 'react';
import {
  Table2,
  Languages,
  GitCompare,
  History,
  BookOpen,
  FolderGit2,
  Sun,
  Moon,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import { ProjectInfo, VersionInfo } from '../../data/mock-data';

export type NavigationTab = 'terms' | 'cat' | 'diff' | 'audit' | 'glossary' | 'projects';

export interface AppLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  projects: ProjectInfo[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  versions: VersionInfo[];
  selectedVersionId: string;
  onSelectVersion: (id: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  children: React.ReactNode;
  termStats?: {
    total: number;
    translatedCount: number;
    untranslatedCount: number;
    warningCount: number;
  };
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  projects,
  selectedProjectId,
  onSelectProject,
  versions,
  selectedVersionId,
  onSelectVersion,
  theme,
  onToggleTheme,
  children,
  termStats = { total: 128, translatedCount: 104, untranslatedCount: 24, warningCount: 3 },
}) => {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);

  const currentProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const currentVersion = versions.find((v) => v.id === selectedVersionId) || versions[0];

  const completionRate = termStats.total > 0
    ? Math.round((termStats.translatedCount / termStats.total) * 100)
    : 0;

  const isDark = theme === 'dark';

  const navItems = [
    {
      id: 'terms' as NavigationTab,
      label: '词条多语言矩阵',
      sublabel: 'Terms & Matrix',
      icon: Table2,
      badge: termStats.total,
    },
    {
      id: 'cat' as NavigationTab,
      label: 'CAT 译员工作台',
      sublabel: 'Translator Studio',
      icon: Languages,
      badge: termStats.untranslatedCount > 0 ? `${termStats.untranslatedCount} 待翻` : undefined,
      badgeColor: 'amber',
    },
    {
      id: 'diff' as NavigationTab,
      label: '版本对比 Diff',
      sublabel: 'Version Diff Engine',
      icon: GitCompare,
      badge: '假差异清洗',
      badgeColor: 'cyan',
    },
    {
      id: 'audit' as NavigationTab,
      label: '变更审计时光机',
      sublabel: 'Audit & Time Machine',
      icon: History,
      badge: '后悔药备份',
      badgeColor: 'emerald',
    },
    {
      id: 'glossary' as NavigationTab,
      label: '术语库与记忆库',
      sublabel: 'Glossary & TM',
      icon: BookOpen,
      badge: '向量直通',
      badgeColor: 'purple',
    },
    {
      id: 'projects' as NavigationTab,
      label: '产品线与版本',
      sublabel: 'Projects & Versions',
      icon: FolderGit2,
      badge: currentVersion?.isSealed ? '已封板' : '编辑中',
      badgeColor: currentVersion?.isSealed ? 'slate' : 'emerald',
    },
  ];

  return (
    <div
      className={`flex w-screen h-screen overflow-hidden font-sans antialiased transition-colors duration-200 ${
        isDark
          ? 'bg-slate-950 text-slate-100 selection:bg-primary-500/30'
          : 'bg-slate-50 text-slate-900 selection:bg-primary-500/20'
      }`}
    >
      {/* ── Left Sidebar Navigation (HeroUI / shadcn Style) ────────────────── */}
      <aside
        className={`w-64 shrink-0 flex flex-col border-r select-none z-20 transition-colors duration-200 ${
          isDark
            ? 'bg-slate-900/90 border-slate-800/80 backdrop-blur-xl'
            : 'bg-white/95 border-slate-200/90 backdrop-blur-xl shadow-xs'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-14 px-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800/80' : 'border-slate-200/80'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-md shadow-primary-500/25 tracking-wider text-sm">
              G
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[14px] tracking-tight">GlossaHub</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-primary-500/15 text-primary-600 dark:text-primary-400 font-bold border border-primary-500/30">
                  TMS 2.0
                </span>
              </div>
              <p className={`text-[11px] leading-none mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                迈金多语言词条协同平台
              </p>
            </div>
          </div>
        </div>

        {/* Project & Version Switcher */}
        <div
          className={`p-3 border-b space-y-2 ${
            isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/70'
          }`}
        >
          {/* Project Dropdown */}
          <div className="relative">
            <label className={`text-[10px] font-semibold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              当前工程项目
            </label>
            <button
              onClick={() => {
                setIsProjectDropdownOpen(!isProjectDropdownOpen);
                setIsVersionDropdownOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-100 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800 shadow-xs'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm">{currentProject.icon}</span>
                <span className="font-semibold truncate text-[12px]">{currentProject.name}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-50" />
            </button>

            {isProjectDropdownOpen && (
              <div
                className={`absolute left-0 right-0 mt-1 py-1 rounded-xl shadow-xl border z-50 text-xs ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  选择硬件产品线空间
                </div>
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj.id);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      proj.id === selectedProjectId
                        ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold'
                        : isDark
                        ? 'hover:bg-slate-800 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{proj.icon}</span>
                      <span className="truncate">{proj.name}</span>
                    </div>
                    {proj.id === selectedProjectId && <CheckCircle2 className="w-3.5 h-3.5 text-primary-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsVersionDropdownOpen(!isVersionDropdownOpen);
                setIsProjectDropdownOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-[11px] font-mono flex items-center justify-between transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentVersion?.isSealed ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'
                  }`}
                />
                <span className="font-semibold">{currentVersion?.versionName || 'v2.0.0'}</span>
                {currentVersion?.isSealed ? (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-slate-500/15 text-slate-500 dark:text-slate-400 font-sans font-medium">
                    已封板
                  </span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-sans font-bold">
                    活跃编辑
                  </span>
                )}
              </div>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {isVersionDropdownOpen && (
              <div
                className={`absolute left-0 right-0 mt-1 py-1 rounded-xl shadow-xl border z-50 text-xs ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  固件基线版本
                </div>
                {versions.map((ver) => (
                  <button
                    key={ver.id}
                    onClick={() => {
                      onSelectVersion(ver.id);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs font-mono flex items-center justify-between transition-colors cursor-pointer ${
                      ver.id === selectedVersionId
                        ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold'
                        : isDark
                        ? 'hover:bg-slate-800 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{ver.versionName}</span>
                    <span className="text-[10px] font-sans opacity-70">
                      {ver.isSealed ? '🔒 封板只读' : '✏️ 活跃中'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <div className={`px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            核心翻译与资产治理
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? isDark
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/25 font-semibold'
                      : 'bg-primary-500 text-white shadow-md shadow-primary-500/20 font-semibold'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'opacity-70'}`} />
                  <div>
                    <div className="leading-tight text-[13px]">{item.label}</div>
                    <div
                      className={`text-[10px] font-mono leading-none mt-0.5 ${
                        isActive ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor === 'amber'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : item.badgeColor === 'cyan'
                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                        : item.badgeColor === 'emerald'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : item.badgeColor === 'purple'
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Global Progress & Gateway Status */}
        <div
          className={`p-3 border-t text-xs ${
            isDark ? 'border-slate-800/80 bg-slate-950/60' : 'border-slate-200/80 bg-slate-50/80'
          }`}
        >
          <div className="mb-2">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>多语言就绪进度</span>
              <span className="font-mono font-bold text-primary-600 dark:text-primary-400">{completionRate}%</span>
            </div>
            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div
            className={`pt-2 border-t flex items-center justify-between text-[10px] ${
              isDark ? 'border-slate-800/60 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}
          >
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>DeepSeek-V3 网关</span>
            </span>
            <span className="font-mono">&lt;20ms TM 直通</span>
          </div>
        </div>
      </aside>

      {/* ── Main Viewport Container ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar (Breadcrumb + Theme Switcher + Profile) */}
        <header
          className={`h-14 shrink-0 px-6 border-b flex items-center justify-between z-10 transition-colors duration-200 ${
            isDark
              ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-md'
              : 'bg-white/80 border-slate-200/80 backdrop-blur-md shadow-xs'
          }`}
        >
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 text-xs">
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>迈金科技</span>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>/</span>
            <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {currentProject.name}
            </span>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>/</span>
            <span className="font-mono text-primary-600 dark:text-primary-400 font-bold px-1.5 py-0.5 rounded bg-primary-500/10">
              {currentVersion.versionName}
            </span>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>/</span>
            <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {navItems.find((i) => i.id === currentTab)?.label}
            </span>
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button (Light / Dark) */}
            <button
              onClick={onToggleTheme}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-100'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-xs'
              }`}
              title="切换主题模式"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>切换为明亮模式</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-primary-600" />
                  <span>切换为深色模式</span>
                </>
              )}
            </button>

            {/* GitHub Repo */}
            <a
              href="https://github.com/jiahao89/magene-glossary"
              target="_blank"
              rel="noreferrer"
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all no-underline ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
              }`}
            >
              <span>GitHub 仓库</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            {/* Current User Badge */}
            <div
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-800 shadow-xs'
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-primary-600 to-amber-500 text-white font-bold flex items-center justify-center text-[10px]">
                张
              </div>
              <span>张工 (固件研发组)</span>
            </div>
          </div>
        </header>

        {/* Primary Page Canvas */}
        <main
          className={`flex-1 overflow-hidden relative transition-colors duration-200 ${
            isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/60 text-slate-900'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
