import { createContext, useContext } from 'react';
import { useOnlineMembers } from './use-online-members';
import type { MembersController } from './members-controller';

export const ChatMembersContext = createContext<{
  controller: MembersController;
  referenceAt: number;
} | null>(null);

export function useChatMembers() {
  const context = useContext(ChatMembersContext);
  if (!context) throw new Error('在线用户列表需要 ChatMembersProvider');
  return { ...useOnlineMembers(context.controller), referenceAt: context.referenceAt };
}
