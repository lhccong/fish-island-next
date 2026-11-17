import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MembersController } from './members-controller';
import { ChatMembersContext } from './chat-members-context';

export function ChatMembersProvider({
  controller,
  children,
}: {
  controller: MembersController;
  children: ReactNode;
}) {
  const [referenceAt] = useState(() => Date.now());
  const context = useMemo(() => ({ controller, referenceAt }), [controller, referenceAt]);
  useEffect(() => controller.load(), [controller]);
  return <ChatMembersContext.Provider value={context}>{children}</ChatMembersContext.Provider>;
}
