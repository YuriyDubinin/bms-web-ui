import { create } from 'zustand';
import { createJSONStorage, devtools, persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';

type UIState = {
  mobileDrawerOpen: boolean;
  /** Свёрнут ли desktop-sidebar (узкая полоска с иконками). */
  sidebarCollapsed: boolean;
  /** Флаг проигранной typed-анимации логотипа (per session). */
  brandTypedOnce: boolean;
  /** Подложено на будущее — переключение темы. Пока используется только 'dark'. */
  theme: ThemeMode;
};

type UIActions = {
  openMobileDrawer: () => void;
  closeMobileDrawer: () => void;
  toggleMobileDrawer: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  markBrandTyped: () => void;
  setTheme: (theme: ThemeMode) => void;
};

export type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        mobileDrawerOpen: false,
        sidebarCollapsed: false,
        brandTypedOnce: false,
        theme: 'dark',

        openMobileDrawer: () =>
          set({ mobileDrawerOpen: true }, false, 'ui/openMobileDrawer'),
        closeMobileDrawer: () =>
          set({ mobileDrawerOpen: false }, false, 'ui/closeMobileDrawer'),
        toggleMobileDrawer: () =>
          set((s) => ({ mobileDrawerOpen: !s.mobileDrawerOpen }), false, 'ui/toggleMobileDrawer'),
        toggleSidebar: () =>
          set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }), false, 'ui/toggleSidebar'),
        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }, false, 'ui/setSidebarCollapsed'),
        markBrandTyped: () =>
          set({ brandTypedOnce: true }, false, 'ui/markBrandTyped'),
        setTheme: (theme) => set({ theme }, false, 'ui/setTheme'),
      }),
      {
        name: 'bms.ui',
        storage: createJSONStorage(() => localStorage),
        // Сохраняем theme и состояние сворачивания sidebar; остальное runtime-only.
        partialize: (s) => ({ theme: s.theme, sidebarCollapsed: s.sidebarCollapsed }),
        version: 1,
      },
    ),
    { name: 'ui', enabled: import.meta.env.DEV },
  ),
);
