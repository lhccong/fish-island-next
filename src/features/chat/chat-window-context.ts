import { createContext, use } from 'react';
import type { ChatPresentation } from './chat-presentation';

export type ChatWindowMode = 'inline' | 'floating' | 'hidden' | 'restoring';
export const ChatWindowContext = createContext<{
  mode: ChatWindowMode;
  suspended: boolean;
  presentation: ChatPresentation;
  setPresentation: (presentation: ChatPresentation) => void;
  setMode: (mode: ChatWindowMode) => void;
  open: () => void;
  restore: () => void;
} | null>(null);

export function useChatWindow() {
  const context = use(ChatWindowContext);
  if (!context) throw new Error('ChatWindowProvider is required');
  return context;
}
