import { createContext, useCallback, useContext } from 'react';
import type { ToolPath } from '@/app/config/tools';

export type ToolPlacement = 'page' | 'window';
export type ToolSlots = Partial<Record<ToolPath, Partial<Record<ToolPlacement, HTMLDivElement>>>>;

interface ToolWindows {
  openTool: (path: ToolPath, origin: HTMLElement) => void;
  openedTools: readonly ToolPath[];
  registerSlot: (path: ToolPath, placement: ToolPlacement, slot: HTMLDivElement | null) => void;
}

export const ToolWindowsContext = createContext<ToolWindows | null>(null);

export function useToolWindows() {
  const windows = useContext(ToolWindowsContext);
  if (!windows) throw new Error('ToolWindowsContext is missing');
  return windows;
}

export function useToolSlot(path: ToolPath, placement: ToolPlacement) {
  const { registerSlot } = useToolWindows();
  return useCallback(
    (slot: HTMLDivElement | null) => registerSlot(path, placement, slot),
    [registerSlot, path, placement],
  );
}
