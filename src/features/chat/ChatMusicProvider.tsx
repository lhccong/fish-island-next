import type { ReactNode } from 'react';
import type { ChatMusicSong } from '@/domain/chat';
import { MusicPlaybackContext } from './music-playback-context';

export function ChatMusicProvider({
  onPlay,
  children,
}: {
  onPlay: (song: ChatMusicSong) => void;
  children: ReactNode;
}) {
  return <MusicPlaybackContext.Provider value={onPlay}>{children}</MusicPlaybackContext.Provider>;
}
