import { create } from 'zustand';
import type { Category } from '../lib/places';

interface FilterState {
  category: Category | null;
  setCategory: (c: Category | null) => void;
}

export const useFilters = create<FilterState>((set) => ({
  category: null,
  setCategory: (category) => set({ category }),
}));
