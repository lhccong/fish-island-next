import { createContext, useContext } from 'react';
import type { ChatListAppearance } from '@/domain/chat';

export const ChatListContext = createContext<{
  appearance: ChatListAppearance;
  readError: string;
  save: (value: ChatListAppearance) => void;
} | null>(null);

export function useChatListAppearance() {
  const context = useContext(ChatListContext);
  if (!context) throw new Error('缺少 ChatListProvider');
  return context;
}
