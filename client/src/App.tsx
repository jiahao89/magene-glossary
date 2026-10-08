import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './stores/query-client';
import { AppLayout, NavigationTab } from './components/layout/AppLayout';
import { TermsMatrixPage } from './pages/TermsMatrixPage';
import { CatStudioPage } from './pages/CatStudioPage';
import { VersionDiffPage } from './pages/VersionDiffPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { GlossaryTmPage } from './pages/GlossaryTmPage';
import { ProjectsVersionsPage } from './pages/ProjectsVersionsPage';
import { TermItem } from './hooks/useTermsQuery';
import {
  MOCK_PROJECTS,
  MOCK_VERSIONS,
  INITIAL_C606_TERMS,
  ProjectInfo,
  VersionInfo,
} from './data/mock-data';
import { useCatStudioStore } from './stores/cat-studio.store';

const DEFAULT_LANGUAGES = ['en', 'de', 'fr', 'es', 'it', 'ja', 'ko', 'ru'];

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentTab, setCurrentTab] = useState<NavigationTab>('terms');

  // Projects & Versions State
  const [projects] = useState<ProjectInfo[]>(MOCK_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('proj-c606');
  const [versionsMap, setVersionsMap] = useState<Record<string, VersionInfo[]>>(MOCK_VERSIONS);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('v2.0.0');

  // Terms State
  const [terms, setTerms] = useState<TermItem[]>(INITIAL_C606_TERMS);

  const catStore = useCatStudioStore();

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(nextTheme);
  };

  // Term Operations
  const handleSaveTermTranslation = async (termId: string, lang: string, text: string) => {
    setTerms((prev) =>
      prev.map((t) => {
        if (t.id !== termId) return t;
        return {
          ...t,
          translations: {
            ...t.translations,
            [lang]: {
              ...(t.translations[lang] || { lang }),
              text,
              status: 'reviewed',
              source: 'human',
              updatedAt: new Date().toISOString(),
            },
          },
        };
      })
    );
  };

  const handleToggleLock = (termId: string, currentLocked: boolean) => {
    setTerms((prev) =>
      prev.map((t) => (t.id === termId ? { ...t, isLocked: !currentLocked } : t))
    );
  };

  const handleAddTerm = (newTermData: Partial<TermItem>) => {
    const newTerm: TermItem = {
      id: `term-${Date.now()}`,
      projectId: selectedProjectId,
      versionId: selectedVersionId,
      kw: newTermData.kw || 'KW_NEW',
      zhCn: newTermData.zhCn || '',
      comment: newTermData.comment || '',
      maxChars: newTermData.maxChars || 24,
      isLocked: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      meta: newTermData.meta || { module: 'activity' },
      translations: newTermData.translations || {
        en: { lang: 'en', text: '', status: 'draft', source: 'human' },
      },
    };
    setTerms([newTerm, ...terms]);
  };

  const handleDeleteTerm = (termId: string) => {
    if (confirm('确认删除该词条及其所有语言译文？此操作将被审计日志记录。')) {
      setTerms((prev) => prev.filter((t) => t.id !== termId));
    }
  };

  // Batch AI Translation Simulation
  const handleBatchAITranslate = async (termIds: string[]) => {
    await new Promise((r) => setTimeout(r, 1200));
    setTerms((prev) =>
      prev.map((t) => {
        if (!termIds.includes(t.id)) return t;
        const updatedTrans = { ...t.translations };

        DEFAULT_LANGUAGES.forEach((lang) => {
          if (!updatedTrans[lang] || !updatedTrans[lang].text.trim()) {
            let sampleText = `${t.zhCn} (${lang.toUpperCase()})`;
            if (lang === 'en') sampleText = t.kw.replace('KW_', '').toLowerCase().replace(/_/g, ' ');
            if (lang === 'de') sampleText = `${t.zhCn} [DE]`;
            if (lang === 'fr') sampleText = `${t.zhCn} [FR]`;

            updatedTrans[lang] = {
              lang,
              text: sampleText,
              status: 'reviewed',
              source: 'ai',
              updatedAt: new Date().toISOString(),
            };
          }
        });

        return { ...t, translations: updatedTrans };
      })
    );
    alert(`成功调用 DeepSeek-V3 直连网关完成 ${termIds.length} 条词条的多语言批量补全！通过 L10n QA 占位符质检。`);
  };

  // Jump to CAT Studio for specific term
  const handleOpenCatStudio = (termId: string) => {
    const term = terms.find((t) => t.id === termId);
    if (term) {
      catStore.setActiveTerm(term.id, term.kw);
    }
    setCurrentTab('cat');
  };

  // Seal Version
  const handleSealVersion = (versionId: string) => {
    if (confirm(`确认对固件版本 [${versionId}] 执行封板？封板后将全表只读加锁保护，并生成只读镜像供 CI/CD 自动编译生成 C 语言头文件。`)) {
      setVersionsMap((prev) => {
        const list = prev[selectedProjectId] || [];
        return {
          ...prev,
          [selectedProjectId]: list.map((v) =>
            v.id === versionId ? { ...v, isSealed: true, sealedAt: new Date().toISOString() } : v
          ),
        };
      });
      // Lock all terms
      setTerms((prev) => prev.map((t) => ({ ...t, isLocked: true })));
      alert(`版本 [${versionId}] 已封板加锁！`);
    }
  };

  // Create Version
  const handleCreateVersion = (projectId: string, versionName: string, comment: string) => {
    const newVer: VersionInfo = {
      id: versionName,
      projectId,
      versionName,
      isSealed: false,
      termCount: terms.length,
      createdAt: new Date().toISOString(),
      comment,
    };
    setVersionsMap((prev) => ({
      ...prev,
      [projectId]: [newVer, ...(prev[projectId] || [])],
    }));
    setSelectedVersionId(versionName);
    alert(`已为产品成功创建新版本 [${versionName}] 并从当前基线克隆全部词条！`);
  };

  const currentVersions = versionsMap[selectedProjectId] || [];

  // Stats calculation
  const termStats = {
    total: terms.length,
    translatedCount: terms.filter((t) =>
      DEFAULT_LANGUAGES.every((l) => Boolean(t.translations[l]?.text?.trim()))
    ).length,
    untranslatedCount: terms.filter((t) =>
      DEFAULT_LANGUAGES.some((l) => !t.translations[l]?.text?.trim())
    ).length,
    warningCount: terms.filter((t) =>
      Object.entries(t.translations).some(
        ([_, tr]) => t.maxChars && tr.text.length > t.maxChars
      )
    ).length,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          const firstVer = (versionsMap[id] || [])[0];
          if (firstVer) setSelectedVersionId(firstVer.id);
        }}
        versions={currentVersions}
        selectedVersionId={selectedVersionId}
        onSelectVersion={setSelectedVersionId}
        theme={theme}
        onToggleTheme={toggleTheme}
        termStats={termStats}
      >
        {currentTab === 'terms' && (
          <TermsMatrixPage
            terms={terms}
            languages={DEFAULT_LANGUAGES}
            onSaveTermTranslation={handleSaveTermTranslation}
            onToggleLock={handleToggleLock}
            onOpenCatStudio={handleOpenCatStudio}
            onOpenHistory={(termId) => {
              const term = terms.find((t) => t.id === termId);
              if (term) catStore.setActiveTerm(term.id, term.kw);
              catStore.setDiffDrawerOpen(true);
              setCurrentTab('audit');
            }}
            onAddTerm={handleAddTerm}
            onDeleteTerm={handleDeleteTerm}
            onBatchAITranslate={handleBatchAITranslate}
            theme={theme}
          />
        )}

        {currentTab === 'cat' && (
          <CatStudioPage
            terms={terms}
            languages={DEFAULT_LANGUAGES}
            activeLanguage={catStore.activeLanguage}
            onSaveTermTranslation={handleSaveTermTranslation}
            onBackToMatrix={() => setCurrentTab('terms')}
            theme={theme}
          />
        )}

        {currentTab === 'diff' && (
          <VersionDiffPage
            versions={currentVersions}
            currentVersionId={selectedVersionId}
            languages={DEFAULT_LANGUAGES}
            theme={theme}
          />
        )}

        {currentTab === 'audit' && (
          <AuditTrailPage theme={theme} />
        )}

        {currentTab === 'glossary' && (
          <GlossaryTmPage theme={theme} />
        )}

        {currentTab === 'projects' && (
          <ProjectsVersionsPage
            projects={projects}
            versionsMap={versionsMap}
            currentProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onSelectVersion={setSelectedVersionId}
            onSealVersion={handleSealVersion}
            onCreateVersion={handleCreateVersion}
            theme={theme}
          />
        )}
      </AppLayout>
    </QueryClientProvider>
  );
};
