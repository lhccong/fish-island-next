import type { AuthUser } from '@/domain/auth';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { createChatDraft } from './chat-draft';
import type { ChatEmoticonPort } from '@/domain/chat';
import { createEmoticonController } from './emoticon-controller';
import type { ChatPreferencesPort, RedPacketPort } from '@/domain/chat';
import { createRedPacketController } from './red-packet-controller';
import { createRedPacketCreation } from './red-packet-creation';
import type { ChatRealtimeController } from './realtime-controller';
import { ChatRealtimeContext } from './realtime-context';
import { useAvatarPreference } from './use-avatar-preference';

export function ChatRealtimeProvider({
  controller,
  userId,
  user,
  preferences,
  redPackets,
  emoticonPort,
  children,
}: {
  controller: ChatRealtimeController;
  userId: string;
  user?: AuthUser | undefined;
  preferences: ChatPreferencesPort;
  redPackets: RedPacketPort;
  emoticonPort: ChatEmoticonPort;
  children: ReactNode;
}) {
  const avatarPreference = useAvatarPreference(preferences);
  const draft = useMemo(() => createChatDraft(userId), [userId]);
  const packets = useMemo(
    () => createRedPacketController(redPackets, userId),
    [redPackets, userId],
  );
  useEffect(() => () => packets.dispose(), [packets]);
  const packetCreation = useMemo(
    () => createRedPacketCreation(redPackets, userId, controller),
    [redPackets, userId, controller],
  );
  useEffect(() => {
    packetCreation.start();
    return () => packetCreation.dispose();
  }, [packetCreation]);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const emoticons = useMemo(
    () => createEmoticonController(emoticonPort, userId),
    [emoticonPort, userId],
  );
  useEffect(() => {
    emoticons.start();
    return () => emoticons.dispose();
  }, [emoticons]);
  return (
    <ChatRealtimeContext.Provider
      value={{
        controller,
        user,
        userId,
        avatarPreference,
        draft,
        composerRef,
        packets,
        emoticons,
        packetCreation,
      }}
    >
      {children}
    </ChatRealtimeContext.Provider>
  );
}
