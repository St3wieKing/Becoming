import { create } from 'zustand';

import type { AIControlMode, Mode } from '@/core/types';

interface SettingsState {
  mode: Mode;
  aiControl: AIControlMode;
  showLeaderboards: boolean;
  setMode: (mode: Mode) => void;
  setAIControl: (aiControl: AIControlMode) => void;
  setShowLeaderboards: (showLeaderboards: boolean) => void;
}

export const useSettings = create<SettingsState>((set) => ({
  mode: 'serious',
  aiControl: 'assisted',
  showLeaderboards: false,
  setMode: (mode) => set({ mode }),
  setAIControl: (aiControl) => set({ aiControl }),
  setShowLeaderboards: (showLeaderboards) => set({ showLeaderboards }),
}));
