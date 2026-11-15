import { createContext, useContext } from 'react';
export const IslandSidebarContext = createContext<{
  tab: 'notebook' | 'circle';
  setTab: (tab: 'notebook' | 'circle') => void;
  editing: boolean;
  visited: boolean;
  activate: () => void;
  setEditing: (editing: boolean) => void;
} | null>(null);
export function useIslandSidebar() {
  const context = useContext(IslandSidebarContext);
  if (!context) throw new Error('IslandSidebarProvider required');
  return context;
}
