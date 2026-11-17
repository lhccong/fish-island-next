import { createContext, useContext } from 'react';
import type { Song } from './domain';

export const MusicContext = createContext<{ open: () => void; play: (song: Song) => void } | null>(
  null,
);
export function useMusicActions() {
  const value = useContext(MusicContext);
  if (!value) throw new Error('缺少音乐模块');
  return value;
}
