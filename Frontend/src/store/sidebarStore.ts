import { create } from 'zustand';

interface SidebarState {
  isCollapsed: boolean;
  isOpenMobile: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (collapsed: boolean) => void;
  toggleMobile: () => void;
  setMobile: (open: boolean) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  isCollapsed: localStorage.getItem('cafechai-sidebar-collapsed') === 'true',
  isOpenMobile: false,
  toggleCollapsed: () => set((state) => {
    const collapsed = !state.isCollapsed;
    localStorage.setItem('cafechai-sidebar-collapsed', String(collapsed));
    return { isCollapsed: collapsed };
  }),
  setCollapsed: (collapsed) => {
    localStorage.setItem('cafechai-sidebar-collapsed', String(collapsed));
    set({ isCollapsed: collapsed });
  },
  toggleMobile: () => set((state) => ({ isOpenMobile: !state.isOpenMobile })),
  setMobile: (open) => set({ isOpenMobile: open }),
}));
