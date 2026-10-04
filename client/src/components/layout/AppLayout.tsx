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
  Search,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown
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
      badge: '智能清洗',
      badgeColor: 'cyan',
    },
    {
      id: 'audit' as NavigationTab,
      label: '变更审计与时光机',
      sublabel: 'Audit & Time Machine',
      icon: History,
      badge: '双向后悔药',
      badgeColor: 'emerald',
    },
    {
      id: 'glossary' as NavigationTab,
      label: '术语库与记忆库',
      sublabel: 'Glossary & TM',
      icon: BookOpen,
      badge: '向量直通',
    },
    {
      id: 'projects' as NavigationTab,
      label: '产品线与固件版本',
      sublabel: 'Projects & Versions',
      icon: FolderGit2,
      badge: currentVersion?.isSealed ? '已封板' : '编辑中',
      badgeColor: currentVersion?.isSealed ? 'slate' : 'emerald',
    },
  ];

  return (
    <div className={`flex w-screen h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} font-sans`}>
      {/* ── Left Sidebar Navigation ────────────────────────────────────────── */}
      <aside className={`w-64 shrink-0 flex flex-col border-r ${theme === 'dark' ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'} select-none z-20 transition-colors`}>
        {/* Brand Header */}
        <div className={`h-14 px-4 border-b flex items-center justify-between ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary-600 to-amber-500 flex items-center justify-center font-bold text-white shadow-md shadow-primary-500/20">
              G
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight">GlossaHub</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary-500/15 text-primary-500 font-semibold">
                  TMS v2.0
                </span>
              </div>
              <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                迈金多语言词条协同平台
              </p>
            </div>
          </div>
        </div>

        {/* Project & Version Switcher Card */}
        <div className={`p-3 border-b ${theme === 'dark' ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200 bg-slate-50/60'}`}>
          <div className="relative mb-2">
            <button
              onClick={() => {
                setIsProjectDropdownOpen(!isProjectDropdownOpen);
                setIsVersionDropdownOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-sm">{currentProject.icon}</span>
                <span className="font-semibold truncate">{currentProject.name}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>

            {isProjectDropdownOpen && (
              <div className={`absolute left-0 right-0 mt-1 py-1 rounded-xl shadow-xl border z-50 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  切换产品工程项目
                </div>
                {projects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj.id);
                      setIsProjectDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                      proj.id === selectedProjectId
                        ? 'bg-primary-500/10 text-primary-500 font-bold'
                        : theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{proj.icon}</span>
                    <span className="truncate">{proj.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Version Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setIsVersionDropdownOpen(!isVersionDropdownOpen);
                setIsProjectDropdownOpen(false);
              }}
              className={`w-full text-left px-2.5 py-1 rounded-md border text-[11px] font-mono flex items-center justify-between transition-colors ${
                theme === 'dark'
                  ? 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  : 'bg-white/80 border-slate-200 text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className={`w-1.5 h-1.5 rounded-full ${currentVersion?.isSealed ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse'}`} />
                <span>版本: {currentVersion?.versionName || 'v2.0.0'}</span>
                {currentVersion?.isSealed ? (
                  <span className="text-[9px] px-1 rounded bg-slate-500/15 text-slate-400 font-sans">
                    已封板
                  </span>
                ) : (
                  <span className="text-[9px] px-1 rounded bg-emerald-500/15 text-emerald-500 font-sans">
                    活跃
                  </span>
                )}
              </div>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isVersionDropdownOpen && (
              <div className={`absolute left-0 right-0 mt-1 py-1 rounded-xl shadow-xl border z-50 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
              }`}>
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  固件基线版本
                </div>
                {versions.map((ver) => (
                  <button
                    key={ver.id}
                    onClick={() => {
                      onSelectVersion(ver.id);
                      setIsVersionDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono flex items-center justify-between transition-colors ${
                      ver.id === selectedVersionId
                        ? 'bg-primary-500/10 text-primary-500 font-bold'
                        : theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{ver.versionName}</span>
                    <span className="text-[10px] font-sans opacity-70">
                      {ver.isSealed ? '🔒 封板' : '✏️ 编辑'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            词条翻译协同平台核心
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
                    ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20 font-semibold'
                    : theme === 'dark'
                    ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'opacity-70'}`} />
                  <div>
                    <div className="leading-tight">{item.label}</div>
                    <div className={`text-[10px] font-mono leading-none ${isActive ? 'text-white/80' : 'opacity-50'}`}>
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.badgeColor === 'amber'
                        ? 'bg-amber-500/20 text-amber-500'
                        : item.badgeColor === 'cyan'
                        ? 'bg-cyan-500/20 text-cyan-500'
                        : item.badgeColor === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : theme === 'dark'
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
        <div className={`p-3 border-t text-xs ${theme === 'dark' ? 'border-slate-800 bg-slate-950/60' : 'border-slate-200 bg-slate-50'}`}>
          <div className="mb-2">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400">当前版本多语言完成度</span>
              <span className="font-mono font-bold text-primary-500">{completionRate}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span>AI 直连: DeepSeek-V3</span>
            </span>
            <span className="font-mono text-slate-500">&lt;20ms TM</span>
          </div>
        </div>
      </aside>

      {/* ── Main Viewport Container ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className={`h-14 shrink-0 px-6 border-b flex items-center justify-between z-10 ${
          theme === 'dark' ? 'bg-slate-900/80 border-slate-800 backdrop-blur-md' : 'bg-white/90 border-slate-200 backdrop-blur-md'
        }`}>
          {/* Breadcrumb Path */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">迈金科技</span>
            <span className="text-slate-500">/</span>
            <span className="font-medium text-slate-300">{currentProject.name}</span>
            <span className="text-slate-500">/</span>
            <span className="font-mono text-primary-500 font-semibold">{currentVersion.versionName}</span>
            <span className="text-slate-500">/</span>
            <span className="font-semibold">{navItems.find((i) => i.id === currentTab)?.label}</span>
          </div>

          {/* Quick Actions & Profile */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title="切换主题"
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 text-amber-400" /> : <Sun className="w-4 h-4 text-primary-500" />}
            </button>

            {/* GitHub Repo */}
            <a
              href="https://github.com/jiahao89/magene-glossary"
              target="_blank"
              rel="noreferrer"
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors no-underline ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>GitHub 仓库</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>

            {/* Current User Badge */}
            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-2 text-xs ${
              theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-800'
            }`}>
              <div className="w-5 h-5 rounded-full bg-primary-600 text-white font-bold flex items-center justify-center text-[10px]">
                张
              </div>
              <span className="font-medium">张工 (固件研发)</span>
            </div>
          </div>
        </header>

        {/* Primary Page Canvas */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};
