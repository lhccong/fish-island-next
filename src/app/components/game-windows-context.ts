import { createContext, useContext } from 'react';

export type GameId = 'farm' | 'life' | 'stock';
export const gameTitles: Record<GameId, string> = {
  farm: '摸鱼农场',
  life: '人生重开模拟器',
  stock: '摸鱼股市',
};
export const GameWindowsContext = createContext<(id: GameId) => void>(() => {});
export function useGameWindows() {
  return useContext(GameWindowsContext);
}
