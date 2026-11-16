import { lazy, Suspense, useEffect } from 'react';
import { useChatWindow } from '@/features/chat';
import { RequireAuth } from './RequireAuth';
import { PageLoading } from './PageLoading';

const ChatPage = lazy(() =>
  import('@/app/pages/ChatPlaceholderPage').then((module) => ({
    default: module.ChatPlaceholderPage,
  })),
);
const ChatMiniPage = lazy(() =>
  import('@/app/pages/ChatMiniPage').then((module) => ({ default: module.ChatMiniPage })),
);

export function ChatPageHost({
  active,
  standalone = false,
}: {
  active: boolean;
  standalone?: boolean;
}) {
  const { mode, setMode } = useChatWindow();
  useEffect(() => {
    if (active && mode === 'restoring') setMode('inline');
  }, [active, mode, setMode]);
  if (!active && mode === 'inline') return null;
  return (
    <div hidden={!active}>
      <Suspense fallback={active ? <PageLoading /> : null}>
        <RequireAuth>{standalone ? <ChatMiniPage /> : <ChatPage />}</RequireAuth>
      </Suspense>
    </div>
  );
}
