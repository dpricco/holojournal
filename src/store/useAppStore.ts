import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  geminiApiKey: string | null;
  googleClientId: string | null;
  isAuthenticated: boolean;
  setGeminiApiKey: (key: string) => void;
  setGoogleClientId: (id: string) => void;
  setAuthenticated: (status: boolean) => void;
  clearCredentials: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      geminiApiKey: null,
      googleClientId: null,
      isAuthenticated: false,
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setGoogleClientId: (id) => set({ googleClientId: id }),
      setAuthenticated: (status) => set({ isAuthenticated: status }),
      clearCredentials: () => set({ geminiApiKey: null, googleClientId: null, isAuthenticated: false }),
    }),
    {
      name: 'holojournal-storage',
      // only persist keys
      partialize: (state) => ({ 
        geminiApiKey: state.geminiApiKey, 
        googleClientId: state.googleClientId 
      }),
    }
  )
);
