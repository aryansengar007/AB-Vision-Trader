import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreState {
  // Trading state
  selectedTicker: string;
  setSelectedTicker: (ticker: string) => void;

  // User preferences
  isDarkMode: boolean;
  setIsDarkMode: (isDark: boolean) => void;

  // API configuration
  apiBaseUrl: string;
  setApiBaseUrl: (url: string) => void;

  // Training state
  isTraining: boolean;
  setIsTraining: (isTraining: boolean) => void;
  trainingProgress: number;
  setTrainingProgress: (progress: number) => void;

  // Evaluation state
  isEvaluating: boolean;
  setIsEvaluating: (isEvaluating: boolean) => void;

  // Clear cache/preferences
  resetPreferences: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Trading state
      selectedTicker: 'AAPL',
      setSelectedTicker: (ticker) => set({ selectedTicker: ticker }),

      // User preferences
      isDarkMode: true,
      setIsDarkMode: (isDark) => {
        set({ isDarkMode: isDark });
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      // API configuration
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
      setApiBaseUrl: (url) => set({ apiBaseUrl: url }),

      // Training state
      isTraining: false,
      setIsTraining: (isTraining) => set({ isTraining }),
      trainingProgress: 0,
      setTrainingProgress: (progress) => set({ trainingProgress: progress }),

      // Evaluation state
      isEvaluating: false,
      setIsEvaluating: (isEvaluating) => set({ isEvaluating }),

      // Reset preferences
      resetPreferences: () => {
        set({
          isDarkMode: true,
          apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
        });
        document.documentElement.classList.add('dark');
      },
    }),
    {
      name: 'trading-agent-store',
      partialize: (state) => ({
        selectedTicker: state.selectedTicker,
        isDarkMode: state.isDarkMode,
        apiBaseUrl: state.apiBaseUrl,
      }),
    }
  )
);
