import { create } from 'zustand';

export interface CatStudioState {
  activeTermId: string | null;
  activeTermKw: string | null;
  activeLanguage: string;
  filterModule: string;
  filterStatus: 'all' | 'todo' | 'qa_warning' | 'approved';
  searchQuery: string;
  isSidebarCollapsed: boolean;
  isDiffDrawerOpen: boolean;
  isRollbackModalOpen: boolean;
  selectedRollbackSnapshotId: string | null;
  activeHardwareMode: 'lcd' | 'oled';

  // Actions
  setActiveTerm: (termId: string | null, kw?: string | null) => void;
  stepNextTerm: (termIds: string[]) => void;
  stepPrevTerm: (termIds: string[]) => void;
  setActiveLanguage: (lang: string) => void;
  setFilterModule: (mod: string) => void;
  setFilterStatus: (status: 'all' | 'todo' | 'qa_warning' | 'approved') => void;
  setSearchQuery: (query: string) => void;
  toggleSidebar: () => void;
  setDiffDrawerOpen: (open: boolean) => void;
  openRollbackModal: (snapshotId: string) => void;
  closeRollbackModal: () => void;
  setHardwareMode: (mode: 'lcd' | 'oled') => void;
  reset: () => void;
}

const initialState = {
  activeTermId: null,
  activeTermKw: null,
  activeLanguage: 'en',
  filterModule: 'all',
  filterStatus: 'all' as const,
  searchQuery: '',
  isSidebarCollapsed: false,
  isDiffDrawerOpen: false,
  isRollbackModalOpen: false,
  selectedRollbackSnapshotId: null,
  activeHardwareMode: 'lcd' as const,
};

export const useCatStudioStore = create<CatStudioState>((set, get) => ({
  ...initialState,

  setActiveTerm: (termId, kw = null) => {
    set({ activeTermId: termId, activeTermKw: kw });
  },

  stepNextTerm: (termIds) => {
    const { activeTermId } = get();
    if (!termIds || termIds.length === 0) return;
    if (!activeTermId) {
      set({ activeTermId: termIds[0] });
      return;
    }
    const idx = termIds.indexOf(activeTermId);
    if (idx !== -1 && idx < termIds.length - 1) {
      set({ activeTermId: termIds[idx + 1] });
    }
  },

  stepPrevTerm: (termIds) => {
    const { activeTermId } = get();
    if (!termIds || termIds.length === 0) return;
    if (!activeTermId) {
      set({ activeTermId: termIds[0] });
      return;
    }
    const idx = termIds.indexOf(activeTermId);
    if (idx > 0) {
      set({ activeTermId: termIds[idx - 1] });
    }
  },

  setActiveLanguage: (activeLanguage) => set({ activeLanguage }),
  setFilterModule: (filterModule) => set({ filterModule }),
  setFilterStatus: (filterStatus) => set({ filterStatus }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setDiffDrawerOpen: (isDiffDrawerOpen) => set({ isDiffDrawerOpen }),
  openRollbackModal: (snapshotId) =>
    set({ isRollbackModalOpen: true, selectedRollbackSnapshotId: snapshotId }),
  closeRollbackModal: () =>
    set({ isRollbackModalOpen: false, selectedRollbackSnapshotId: null }),
  setHardwareMode: (activeHardwareMode) => set({ activeHardwareMode }),
  reset: () => set(initialState),
}));
