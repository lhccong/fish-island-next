import { createContext, useContext } from 'react';

export type GameId = 'farm' | 'life' | 'stock' | 'gomoku' | 'undercover' | 'draw' | 'landlords';
export const gameTitles: Record<GameId, string> = {
  farm: '摸鱼农场',
  life: '人生重开模拟器',
  stock: '摸鱼股市',
  gomoku: '五子棋',
  undercover: '谁是卧底',
  draw: '你画我猜',
  landlords: '斗地主',
};
export const GameWindowsContext = createContext<(id: GameId) => void>(() => {});
export function useGameWindows() {
  return useContext(GameWindowsContext);
}
