import { useCallback, type ReactNode } from 'react';
import {
  createMusicClient,
  MusicProvider,
  MusicLauncher,
  useMusicActions,
  type Song,
} from '@/third-party/music';
import { encodeMusicMessage } from '@/domain/chat';
import { ChatMusicProvider } from '@/features/chat';
import { chatRealtime } from '@/app/config/chat';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { useAuth } from '@/features/auth';
import { apiBaseUrl } from '@/app/config/api';
import { authController } from '@/app/config/auth';

const vault = createBrowserSessionVault(apiBaseUrl);
const port = createMusicClient(
  apiBaseUrl,
  () => vault.read(),
  () => void authController.restore(true),
);

export function MusicSession({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const account = session.status === 'authenticated' ? session.user.id : '';
  const share = useCallback(
    (song: Song) => {
      if (session.status !== 'authenticated') throw new Error('请登录后发送音乐');
      if (!chatRealtime.sender.send(encodeMusicMessage(song), undefined, session.user))
        throw new Error('音乐消息未提交，请稍后重试');
    },
    [session],
  );
  return (
    <MusicProvider key={account} port={port} onShare={share}>
      <ChatMusicBridge>{children}</ChatMusicBridge>
    </MusicProvider>
  );
}
function ChatMusicBridge({ children }: { children: ReactNode }) {
  const { play } = useMusicActions();
  return <ChatMusicProvider onPlay={play}>{children}</ChatMusicProvider>;
}
export function ChatMusicTool() {
  return <MusicLauncher />;
}
