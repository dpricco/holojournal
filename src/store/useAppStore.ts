import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  geminiApiKey: string | null;
  googleClientId: string | null;
  userName: string;
  isAuthenticated: boolean;
  setGeminiApiKey: (key: string) => void;
  setGoogleClientId: (id: string) => void;
  setUserName: (name: string) => void;
  setAuthenticated: (status: boolean) => void;
  clearCredentials: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      geminiApiKey: null,
      googleClientId: null,
      userName: '',
      isAuthenticated: false,
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setGoogleClientId: (id) => set({ googleClientId: id }),
      setUserName: (name) => set({ userName: name }),
      setAuthenticated: (status) => set({ isAuthenticated: status }),
      clearCredentials: () => set({ geminiApiKey: null, googleClientId: null, userName: '', isAuthenticated: false }),
    }),
    {
      name: 'holojournal-storage',
      // only persist keys
      partialize: (state) => ({ 
        geminiApiKey: state.geminiApiKey, 
        googleClientId: state.googleClientId,
        userName: state.userName
      }),
    }
  )
);
