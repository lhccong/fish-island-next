import { createContext, useContext } from 'react';
import type { useOnlineMembers } from './use-online-members';

export const ChatMembersContext = createContext<ReturnType<typeof useOnlineMembers> | null>(null);

export function useChatMembers() {
  const context = useContext(ChatMembersContext);
  if (!context) throw new Error('在线用户列表需要 ChatMembersProvider');
  return context;
}
