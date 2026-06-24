import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarCollapsed: boolean;
  // Mobile slide-in nav drawer (not persisted — always starts closed)
  mobileNavOpen: boolean;
  _hasHydrated: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  toggleMobileNav: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      _hasHydrated: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      toggleMobileNav: () => set((state) => ({ mobileNavOpen: !state.mobileNavOpen })),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "pezcrm-ui",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({ sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);

// Hook that returns safe defaults until hydration is complete
export const useSidebarState = () => {
  const { sidebarCollapsed, _hasHydrated, toggleSidebar, setSidebarCollapsed } = useUIStore();
  
  return {
    // Always return false during SSR/before hydration to prevent mismatch
    isCollapsed: _hasHydrated ? sidebarCollapsed : false,
    isHydrated: _hasHydrated,
    toggleSidebar,
    setSidebarCollapsed,
  };
};
