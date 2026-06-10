import { create } from "zustand";
import {
  ensureSession,
  getProgress,
  getStoredAdminKey,
  getStoredUserId,
  setStoredAdminKey,
} from "./api";
import type { Progress } from "./types";

interface AppState {
  userId: string | null;
  adminKey: string | null;
  progress: Progress | null;
  /** Current position within the active pair flow (pairId -> step index). */
  flowStep: Record<string, number>;

  bootSession: () => Promise<string>;
  setAdminKey: (key: string | null) => void;
  refreshProgress: () => Promise<void>;
  setFlowStep: (pairId: string, step: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  userId: getStoredUserId(),
  adminKey: getStoredAdminKey(),
  progress: null,
  flowStep: {},

  bootSession: async () => {
    const userId = await ensureSession();
    if (get().userId !== userId) set({ userId });
    return userId;
  },

  setAdminKey: (key) => {
    setStoredAdminKey(key);
    set({ adminKey: key });
  },

  refreshProgress: async () => {
    try {
      await get().bootSession();
      const progress = await getProgress();
      set({ progress });
    } catch {
      // Nav badges are decorative; never block the UI on progress.
    }
  },

  setFlowStep: (pairId, step) =>
    set((s) => ({ flowStep: { ...s.flowStep, [pairId]: step } })),
}));
