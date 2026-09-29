import { create } from 'zustand';

export interface GridCellCoordinate {
  termId: string;
  lang: string;
}

export interface GridSelectionState {
  selectedTermIds: Set<string>;
  activeCell: GridCellCoordinate | null;
  isAllSelected: boolean;

  // Actions
  toggleSelectTerm: (termId: string) => void;
  selectAllTerms: (allIds: string[]) => void;
  clearSelection: () => void;
  setActiveCell: (coord: GridCellCoordinate | null) => void;
  navigateCell: (
    currentCoord: GridCellCoordinate,
    direction: 'up' | 'down' | 'left' | 'right',
    allTermIds: string[],
    allLangs: string[]
  ) => void;
}

export const useGridSelectionStore = create<GridSelectionState>((set, get) => ({
  selectedTermIds: new Set<string>(),
  activeCell: null,
  isAllSelected: false,

  toggleSelectTerm: (termId) => {
    set((state) => {
      const next = new Set(state.selectedTermIds);
      if (next.has(termId)) {
        next.delete(termId);
      } else {
        next.add(termId);
      }
      return { selectedTermIds: next, isAllSelected: false };
    });
  },

  selectAllTerms: (allIds) => {
    set({
      selectedTermIds: new Set(allIds),
      isAllSelected: true,
    });
  },

  clearSelection: () => {
    set({
      selectedTermIds: new Set(),
      isAllSelected: false,
    });
  },

  setActiveCell: (activeCell) => set({ activeCell }),

  navigateCell: (current, direction, allTermIds, allLangs) => {
    const rowIdx = allTermIds.indexOf(current.termId);
    const colIdx = allLangs.indexOf(current.lang);
    if (rowIdx === -1 || colIdx === -1) return;

    let nextRow = rowIdx;
    let nextCol = colIdx;

    if (direction === 'up' && rowIdx > 0) nextRow = rowIdx - 1;
    if (direction === 'down' && rowIdx < allTermIds.length - 1) nextRow = rowIdx + 1;
    if (direction === 'left' && colIdx > 0) nextCol = colIdx - 1;
    if (direction === 'right' && colIdx < allLangs.length - 1) nextCol = colIdx + 1;

    set({
      activeCell: {
        termId: allTermIds[nextRow],
        lang: allLangs[nextCol],
      },
    });
  },
}));
