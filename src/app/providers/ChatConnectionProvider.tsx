import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/features/auth';
import { ChatRealtimeProvider, RemarksProvider } from '@/features/chat';
import {
  chatRealtime,
  chatRemarks,
  chatPreferences,
  chatRedPackets,
  chatEmoticons,
  chatImageUpload,
} from '@/app/config/chat';

export function ChatConnectionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session.status === 'authenticated' ? session.user.id : '';
  useEffect(() => {
    if (userId) return chatRealtime.start();
  }, [userId]);
  return (
    <ChatRealtimeProvider
      controller={chatRealtime}
      userId={userId}
      user={session.status === 'authenticated' ? session.user : undefined}
      preferences={chatPreferences}
      redPackets={chatRedPackets}
      emoticonPort={chatEmoticons}
      imageUploadPort={chatImageUpload}
    >
      <RemarksProvider key={userId} port={chatRemarks} userId={userId}>
        {children}
      </RemarksProvider>
    </ChatRealtimeProvider>
  );
}
