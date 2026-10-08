import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserPreferencesState {
  theme: 'dark' | 'light';
  visibleLanguages: string[];
  activeProjectId: string;
  isSidebarCollapsed: boolean;
  operatorName: string;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setVisibleLanguages: (langs: string[]) => void;
  toggleLanguageVisibility: (lang: string) => void;
  setActiveProjectId: (id: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setOperatorName: (name: string) => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      visibleLanguages: ['en', 'de', 'fr', 'es', 'it', 'ja'],
      activeProjectId: 'proj-c606',
      isSidebarCollapsed: false,
      operatorName: '张工 (固件研发组)',

      setTheme: (theme) => {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('dark', 'light');
          document.documentElement.classList.add(theme);
        }
        set({ theme });
      },

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },

      setVisibleLanguages: (visibleLanguages) => set({ visibleLanguages }),

      toggleLanguageVisibility: (lang) => {
        const current = get().visibleLanguages;
        if (current.includes(lang)) {
          if (current.length > 1) {
            set({ visibleLanguages: current.filter((l) => l !== lang) });
          }
        } else {
          set({ visibleLanguages: [...current, lang] });
        }
      },

      setActiveProjectId: (activeProjectId) => set({ activeProjectId }),

      setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),

      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      setOperatorName: (operatorName) => set({ operatorName }),
    }),
    {
      name: 'glossa_user_preferences_v2',
    }
  )
);
