import { create } from 'zustand';
import { db } from '../db/db';

type SectionType = 'dashboard' | 'investments' | 'subscriptions' | 'budgets' | 'family' | 'ai' | 'gamification' | 'settings' | 'history' | 'profile';
type ThemeType = 'dark' | 'light' | 'amoled';

interface AppState {
  activeSection: SectionType;
  theme: ThemeType;
  commandPaletteOpen: boolean;
  activeTransactionModal: null | 'income' | 'expense';
  xp: number;
  level: number;
  streak: number;
  budgetMode: 'salary' | 'vacation' | 'emergency' | 'festival' | 'student' | 'ai';
  isAuthenticated: boolean;
  selectedMonth: number; // 1-12
  selectedYear: number;
  isMonthLoading: boolean;
  editingTransactionId: string | null;
  firebaseUser: any | null;
  
  // Actions
  setActiveSection: (section: SectionType) => void;
  setTheme: (theme: ThemeType) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setActiveTransactionModal: (modal: null | 'income' | 'expense') => void;
  syncProfileData: () => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  setIsAuthenticated: (auth: boolean) => void;
  setSelectedMonth: (month: number) => void;
  setSelectedYear: (year: number) => void;
  setIsMonthLoading: (loading: boolean) => void;
  setEditingTransactionId: (id: string | null) => void;
  setFirebaseUser: (user: any | null) => void;
  toasts: { id: string; message: string; type: 'success' | 'info' | 'error' }[];
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
}

export const useStore = create<AppState>()((set, get) => ({
  activeSection: 'dashboard',
  theme: 'dark',
  commandPaletteOpen: false,
  activeTransactionModal: null,
  xp: 680,
  level: 4,
  streak: 12,
  budgetMode: 'ai',
  isAuthenticated: localStorage.getItem('xpenser_auth') === 'true',
  selectedMonth: parseInt(localStorage.getItem('xpenser_selected_month') || String(new Date().getMonth() + 1)),
  selectedYear: parseInt(localStorage.getItem('xpenser_selected_year') || String(new Date().getFullYear())),
  isMonthLoading: false,
  editingTransactionId: null,
  firebaseUser: null,

  setActiveSection: (section) => set({ activeSection: section }),
  
  setTheme: (theme) => {
    set({ theme });
    document.documentElement.setAttribute('data-theme', theme);
    // Persist to IndexedDB userProfile
    db.userProfile.update('profile', { theme }).catch(console.error);
  },

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  
  setActiveTransactionModal: (modal) => set({ activeTransactionModal: modal }),
  
  setIsAuthenticated: (auth) => {
    set({ isAuthenticated: auth });
    localStorage.setItem('xpenser_auth', String(auth));
  },

  setSelectedMonth: (month) => {
    localStorage.setItem('xpenser_selected_month', String(month));
    set({ selectedMonth: month });
  },

  setSelectedYear: (year) => {
    localStorage.setItem('xpenser_selected_year', String(year));
    set({ selectedYear: year });
  },

  setIsMonthLoading: (loading) => set({ isMonthLoading: loading }),
  setEditingTransactionId: (id) => set({ editingTransactionId: id }),
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  toasts: [],
  addToast: (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 4500);
  },
  removeToast: (id) => {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
  },

  syncProfileData: async () => {
    try {
      const profile = await db.userProfile.get('profile');
      if (profile) {
        set({
          theme: profile.theme,
          xp: profile.xp,
          level: profile.level,
          streak: profile.streak,
          budgetMode: profile.budgetMode
        });
        document.documentElement.setAttribute('data-theme', profile.theme);
      }
    } catch (e) {
      console.error('Failed to sync profile data from DB:', e);
    }
  },

  addXp: async (amount) => {
    const currentXp = get().xp + amount;
    const pointsPerLevel = 250;
    const newLevel = Math.floor(currentXp / pointsPerLevel) + 1;
    const hasLeveledUp = newLevel > get().level;

    set({ xp: currentXp, level: newLevel });

    try {
      await db.userProfile.update('profile', { 
        xp: currentXp, 
        level: newLevel 
      });
      
      if (hasLeveledUp) {
        // Trigger window event so components can show level-up confetti!
        window.dispatchEvent(new CustomEvent('xpenser-level-up', { detail: { level: newLevel } }));
      }
    } catch (e) {
      console.error('Failed to update XP in DB:', e);
    }
  }
}));
