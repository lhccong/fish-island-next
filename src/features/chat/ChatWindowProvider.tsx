import { useState, type ReactNode } from 'react';
import { ChatWindowContext, type ChatWindowMode } from './chat-window-context';
import type { ChatPresentation } from './chat-presentation';

export function ChatWindowProvider({
  children,
  suspended,
  onOpen,
  onRestore,
  initialPresentation = 'conversation',
}: {
  children: ReactNode;
  suspended: boolean;
  onOpen: () => void;
  onRestore: () => void;
  initialPresentation?: ChatPresentation;
}) {
  const [mode, setMode] = useState<ChatWindowMode>('inline');
  const [presentation, setPresentation] = useState<ChatPresentation>(initialPresentation);
  return (
    <ChatWindowContext
      value={{
        mode,
        suspended,
        presentation,
        setPresentation,
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
