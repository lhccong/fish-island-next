import { createContext } from 'react';
import type { ChatMusicSong } from '@/domain/chat';

export const MusicPlaybackContext = createContext<((song: ChatMusicSong) => void) | null>(null);
