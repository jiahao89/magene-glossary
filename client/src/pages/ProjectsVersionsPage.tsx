import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Lock,
  Unlock,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpRight,
  GitBranch,
  ShieldCheck,
  FileCode2,
  Check
} from 'lucide-react';
import { ProjectInfo, VersionInfo } from '../data/mock-data';
import { GlossaModalV2 } from '../components/common/GlossaModalV2';

export interface ProjectsVersionsPageProps {
  projects: ProjectInfo[];
  versionsMap: Record<string, VersionInfo[]>;
  currentProjectId: string;
  onSelectProject: (id: string) => void;
  onSelectVersion: (id: string) => void;
  onSealVersion: (versionId: string) => void;
  onCreateVersion: (projectId: string, versionName: string, comment: string) => void;
  theme: 'dark' | 'light';
}

export const ProjectsVersionsPage: React.FC<ProjectsVersionsPageProps> = ({
  projects,
  versionsMap,
  currentProjectId,
  onSelectProject,
  onSelectVersion,
  onSealVersion,
  onCreateVersion,
  theme,
}) => {
  const isDark = theme === 'dark';
  const [selectedProjId, setSelectedProjId] = useState(currentProjectId);
  const [isNewVersionModalOpen, setIsNewVersionModalOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionComment, setNewVersionComment] = useState('');

  const activeProject = projects.find((p) => p.id === selectedProjId) || projects[0];
  const projectVersions = versionsMap[selectedProjId] || [];

  const handleCreateVersionSubmit = () => {
    if (!newVersionName.trim()) return;
    onCreateVersion(selectedProjId, newVersionName, newVersionComment);
    setIsNewVersionModalOpen(false);
    setNewVersionName('');
    setNewVersionComment('');
  };

  return (
    <div
      className={`flex w-full h-full overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* ── Left Project Lines List (HeroUI Sidebar Cards) ───────────────── */}
      <div
        className={`w-80 shrink-0 border-r flex flex-col transition-colors duration-200 ${
          isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200/90 shadow-xs'
        }`}
      >
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div>
            <h3 className={`text-sm font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              <FolderGit2 className="w-4 h-4 text-primary-500" />
              <span>硬件产品线空间</span>
            </h3>
            <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              按产品物理隔离的词库与目标语种池
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {projects.map((proj) => {
            const isSelected = proj.id === selectedProjId;
            return (
              <div
                key={proj.id}
                onClick={() => {
                  setSelectedProjId(proj.id);
                  onSelectProject(proj.id);
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'border-primary-500/80 bg-primary-500/15 shadow-sm'
                      : 'border-primary-500/80 bg-primary-50/80 shadow-xs'
                    : isDark
                    ? 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
                    : 'border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{proj.icon}</span>
                    <span className={`font-bold text-xs ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {proj.name}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                      isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {proj.code}
                  </span>
                </div>

                <p className={`text-[11px] line-clamp-2 leading-relaxed mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {proj.description}
                </p>

                <div
                  className={`flex items-center justify-between text-[10px] font-mono pt-2 border-t ${
                    isDark ? 'border-slate-800/60 text-slate-400' : 'border-slate-100 text-slate-500'
                  }`}
                >
                  <span>活跃基线: <span className="font-bold text-primary-600 dark:text-primary-400">{proj.activeVersion}</span></span>
                  <span>{proj.targetLanguages.length} 目标语种</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Versions Lifecycle Panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-5">
        <div
          className={`flex flex-wrap items-center justify-between pb-4 border-b gap-4 ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{activeProject.icon}</span>
              <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {activeProject.name}
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                  isDark
                    ? 'bg-slate-800 text-slate-300 border-slate-700'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {activeProject.code}
              </span>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              管理该产品固件的多语言基线版本分支、封板发布锁与 C 语言头文件生成
            </p>
          </div>

          <button
            onClick={() => setIsNewVersionModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-amber-500 hover:from-primary-500 hover:to-amber-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新建版本分支</span>
          </button>
        </div>

        {/* Versions Tree Cards */}
        <div className="flex-1 overflow-y-auto space-y-3.5">
          {projectVersions.map((ver) => (
            <div
              key={ver.id}
              className={`p-5 rounded-2xl border transition-all ${
                ver.isSealed
                  ? isDark
                    ? 'border-slate-800 bg-slate-900/40 opacity-90'
                    : 'border-slate-200 bg-slate-50/70 shadow-2xs'
                  : isDark
                  ? 'border-emerald-500/40 bg-slate-900/80 shadow-md shadow-emerald-500/5'
                  : 'border-emerald-400/60 bg-white shadow-xs'
              }`}
            >
              <div
                className={`flex flex-wrap items-center justify-between pb-3.5 border-b gap-3 ${
                  isDark ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold text-primary-600 dark:text-primary-400">
                    {ver.versionName}
                  </span>
                  {ver.isSealed ? (
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 border ${
                        isDark
                          ? 'bg-slate-800 text-slate-400 border-slate-700'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span>已封板 (SEALED 只读发布镜像)</span>
                    </span>
                  ) : (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>活跃开发中 (EDITING)</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {!ver.isSealed ? (
                    <button
                      onClick={() => onSealVersion(ver.id)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>封板加锁</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => alert(`已生成固件镜像 strings_${ver.versionName}.h，并通过 CI/CD 推送！`)}
                      className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors cursor-pointer border ${
                        isDark
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <FileCode2 className="w-3.5 h-3.5 text-primary-500" />
                      <span>下载 C 头文件</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectVersion(ver.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>切换为当前工作版本</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 text-xs space-y-1.5">
                {ver.comment && (
                  <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    {ver.comment}
                  </p>
                )}
                <div
                  className={`flex flex-wrap items-center gap-6 text-[11px] font-mono pt-1 ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  <span>词条数: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{ver.termCount}</strong> 条</span>
                  <span>创建时间: {new Date(ver.createdAt).toLocaleDateString()}</span>
                  {ver.sealedAt && <span>封板时间: {new Date(ver.sealedAt).toLocaleDateString()}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── New Version Modal ─────────────────────────────────────────────── */}
      <GlossaModalV2
        isOpen={isNewVersionModalOpen}
        title="新建固件基线版本"
        description={`为产品 [${activeProject.name}] 创建新的多语言版本分支`}
        confirmLabel="确认创建并从当前基线克隆词条"
        onConfirm={handleCreateVersionSubmit}
        onCancel={() => setIsNewVersionModalOpen(false)}
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              版本名称 (Version Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder="例如: v2.1.0-alpha"
              className={`w-full px-3 py-2 rounded-xl border text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary-500/40 ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          <div>
            <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              分支说明 / 迭代目标
            </label>
            <textarea
              rows={3}
              value={newVersionComment}
              onChange={(e) => setNewVersionComment(e.target.value)}
              placeholder="例如: 引入第二代雷达尾灯联动与坡度曲线HUD"
              className={`w-full px-3 py-2 rounded-xl border text-xs focus:outline-none resize-none ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-100'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>
        </div>
      </GlossaModalV2>
    </div>
  );
};
