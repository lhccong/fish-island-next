import type { ReactNode } from 'react';
import type { OnlineMembersPort } from '@/domain/chat';
import { useOnlineMembers } from './use-online-members';
import { ChatMembersContext } from './chat-members-context';

export function ChatMembersProvider({
  service,
  children,
}: {
  service: OnlineMembersPort;
  children: ReactNode;
}) {
  const members = useOnlineMembers(service, true);
  return <ChatMembersContext.Provider value={members}>{children}</ChatMembersContext.Provider>;
}
