import { useEffect, type ReactNode } from 'react';
import type { MembersController } from './members-controller';
import { ChatMembersContext } from './chat-members-context';

export function ChatMembersProvider({
  controller,
  children,
}: {
  controller: MembersController;
  children: ReactNode;
}) {
  useEffect(() => controller.load(), [controller]);
  return <ChatMembersContext.Provider value={controller}>{children}</ChatMembersContext.Provider>;
}
