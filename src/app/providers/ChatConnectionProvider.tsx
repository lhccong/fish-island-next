import { useLocation, useNavigate } from 'react-router';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { blacklist } from '@/app/config/account-tools';
import {
  ChatRealtimeProvider,
  RemarksProvider,
  ChatWindowProvider,
  ChatReportProvider,
  ChatBlacklistProvider,
} from '@/features/chat';
import { ChatUserCards } from '@/app/components/ChatUserCards';
import { MusicSession } from '@/app/components/MusicSession';
import {
  chatRealtime,
  chatRemarks,
  chatPreferences,
  chatRedPackets,
  chatLuckyBags,
  chatEmoticons,
  chatImageUpload,
  chatReport,
} from '@/app/config/chat';

export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = session.status === 'authenticated' ? session.user.id : '';
  useEffect(() => {
    const syncBlacklist = () =>
      chatRealtime.setBlockedSenders(blacklist.read(userId).map((user) => user.id));
    syncBlacklist();
    const unsubscribe = blacklist.subscribe(syncBlacklist);
    const stop = userId ? chatRealtime.start() : undefined;
    return () => {
      unsubscribe();
      stop?.();
    };
  }, [userId]);
  return (
    <ChatRealtimeProvider
      blacklist={blacklist}
      controller={chatRealtime}
      userId={userId}
      user={session.status === 'authenticated' ? session.user : undefined}
      preferences={chatPreferences}
      redPackets={chatRedPackets}
      luckyBagPort={chatLuckyBags}
      emoticonPort={chatEmoticons}
      imageUploadPort={chatImageUpload}
    >
      <ChatReportProvider key={userId} port={chatReport}>
        <ChatBlacklistProvider>
          <RemarksProvider key={userId} port={chatRemarks} userId={userId}>
            <ChatUserCards user={session.status === 'authenticated' ? session.user : undefined}>
              <ChatWindowProvider
                key={userId}
                suspended={location.pathname === '/user/login'}
                onOpen={() => void navigate('/')}
                onRestore={() => void navigate('/chat')}
              >
                <MusicSession>{children}</MusicSession>
              </ChatWindowProvider>
            </ChatUserCards>
          </RemarksProvider>
        </ChatBlacklistProvider>
      </ChatReportProvider>
    </ChatRealtimeProvider>
  );
}
