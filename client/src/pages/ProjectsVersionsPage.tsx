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
  FileCode2
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
    <div className="flex w-full h-full overflow-hidden select-none">
      {/* ── Left Project Lines List ───────────────────────────────────────── */}
      <div className={`w-80 shrink-0 border-r flex flex-col ${
        theme === 'dark' ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <FolderGit2 className="w-4 h-4 text-primary-500" />
              <span>硬件产品线空间</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              按产品物理隔离的词库与目标语种池
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {projects.map((proj) => {
            const isSelected = proj.id === selectedProjId;
            return (
              <div
                key={proj.id}
                onClick={() => {
                  setSelectedProjId(proj.id);
                  onSelectProject(proj.id);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary-500/80 bg-primary-500/10 shadow-sm'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{proj.icon}</span>
                    <span className="font-bold text-xs text-slate-100">{proj.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                    {proj.code}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                  {proj.description}
                </p>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
                  <span>活跃基线: {proj.activeVersion}</span>
                  <span>{proj.targetLanguages.length} 目标语种</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right Versions Lifecycle Panel ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{activeProject.icon}</span>
              <h2 className="text-base font-bold text-slate-100">{activeProject.name}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                {activeProject.code}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              管理该产品固件的多语言基线版本分支、封板发布锁与 C 语言头文件生成
            </p>
          </div>

          <button
            onClick={() => setIsNewVersionModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/20 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新建版本分支</span>
          </button>
        </div>

        {/* Versions Tree */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {projectVersions.map((ver) => (
            <div
              key={ver.id}
              className={`p-4 rounded-xl border transition-all ${
                ver.isSealed
                  ? 'border-slate-800 bg-slate-900/40 opacity-90'
                  : 'border-emerald-500/40 bg-slate-900/80 shadow-md shadow-emerald-500/5'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-slate-100">
                      {ver.versionName}
                    </span>
                    {ver.isSealed ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium flex items-center gap-1 border border-slate-700">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>已封板 (SEALED 只读发布镜像)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>活跃开发中 (EDITING)</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {!ver.isSealed ? (
                    <button
                      onClick={() => onSealVersion(ver.id)}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>封板加锁</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => alert(`已生成固件镜像 strings_${ver.versionName}.h，并通过 CI/CD 推送！`)}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileCode2 className="w-3 h-3 text-primary-400" />
                      <span>下载 C 头文件</span>
                    </button>
                  )}

                  <button
                    onClick={() => onSelectVersion(ver.id)}
                    className="px-3 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>切换为当前工作版本</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 text-xs text-slate-400 space-y-1">
                {ver.comment && <p>{ver.comment}</p>}
                <div className="flex items-center gap-6 text-[11px] text-slate-500 font-mono pt-1">
                  <span>词条数: {ver.termCount} 条</span>
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
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              版本名称 (Version Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={newVersionName}
              onChange={(e) => setNewVersionName(e.target.value)}
              placeholder="例如: v2.1.0-alpha"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">分支说明 / 迭代目标</label>
            <textarea
              rows={3}
              value={newVersionComment}
              onChange={(e) => setNewVersionComment(e.target.value)}
              placeholder="例如: 引入第二代雷达尾灯联动与坡度曲线HUD"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none resize-none"
            />
          </div>
        </div>
      </GlossaModalV2>
    </div>
  );
};
