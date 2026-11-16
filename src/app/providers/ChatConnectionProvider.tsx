import { useLocation, useNavigate } from 'react-router';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { blacklist } from '@/app/config/account-tools';
import { ChatRealtimeProvider, RemarksProvider, ChatWindowProvider } from '@/features/chat';
import { ChatUserCards } from '@/app/components/ChatUserCards';
import {
  chatRealtime,
  chatRemarks,
  chatPreferences,
  chatRedPackets,
  chatLuckyBags,
  chatEmoticons,
  chatImageUpload,
} from '@/app/config/chat';

export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = session.status === 'authenticated' ? session.user.id : '';
  useEffect(() => {
    if (userId) return chatRealtime.start();
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
      <RemarksProvider key={userId} port={chatRemarks} userId={userId}>
        <ChatUserCards user={session.status === 'authenticated' ? session.user : undefined}>
          <ChatWindowProvider
            key={userId}
            suspended={location.pathname === '/user/login'}
            onOpen={() => void navigate('/')}
            onRestore={() => void navigate('/chat')}
          >
            {children}
          </ChatWindowProvider>
        </ChatUserCards>
      </RemarksProvider>
    </ChatRealtimeProvider>
  );
}
