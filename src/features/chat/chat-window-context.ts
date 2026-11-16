import { createContext, use } from 'react';

export type ChatWindowMode = 'inline' | 'floating' | 'hidden' | 'restoring';
export const ChatWindowContext = createContext<{
  mode: ChatWindowMode;
  suspended: boolean;
  setMode: (mode: ChatWindowMode) => void;
  open: () => void;
  restore: () => void;
} | null>(null);

export function useChatWindow() {
  const context = use(ChatWindowContext);
  if (!context) throw new Error('ChatWindowProvider is required');
  return context;
}
