import { createContext, useContext } from 'react';
import type { IslandController } from './controller';
export const IslandContext = createContext<IslandController | null>(null);
export function useIsland() {
  const controller = useContext(IslandContext);
  if (!controller) throw new Error('MyIslandProvider required');
  return controller;
}
