import { useState, type ReactNode } from 'react';
import { ChatWindowContext, type ChatWindowMode } from './chat-window-context';

export function ChatWindowProvider({
  children,
  suspended,
  onOpen,
  onRestore,
}: {
  children: ReactNode;
  suspended: boolean;
  onOpen: () => void;
  onRestore: () => void;
}) {
  const [mode, setMode] = useState<ChatWindowMode>('inline');
  return (
    <ChatWindowContext
      value={{
        mode,
        suspended,
        setMode,
        open: () => {
          setMode('floating');
          onOpen();
        },
        restore: () => {
          setMode('restoring');
          onRestore();
        },
      }}
    >
      {children}
    </ChatWindowContext>
  );
}
