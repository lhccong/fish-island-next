import type { AuthUser } from '@/domain/auth';
import type { LuckyBagPort } from '@/domain/chat';
import { createLuckyBagController } from './lucky-bag-controller';
import { createLuckyBagCreation } from './lucky-bag-creation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createMessageNavigation } from './message-navigation';
import { createChatDraft } from './chat-draft';
import type { ChatEmoticonPort, ChatImageUploadPort } from '@/domain/chat';
import { createImageUploadController } from './image-upload-controller';
import { createEmoticonController } from './emoticon-controller';
import type { ChatPreferencesPort, RedPacketPort } from '@/domain/chat';
import { createRedPacketController } from './red-packet-controller';
import { createRedPacketCreation } from './red-packet-creation';
import type { ChatRealtimeController } from './realtime-controller';
import { ChatRealtimeContext } from './realtime-context';
import { useAvatarPreference } from './use-avatar-preference';
import { useBubblePreference } from './use-bubble-preference';
import { useImagePreference } from './use-image-preference';
import type { BlacklistPort } from '@/domain/account-tools';
import { createImageGeometry } from './image-geometry';

export function ChatRealtimeProvider({
  controller,
  userId,
  user,
  preferences,
  redPackets,
  luckyBagPort,
  emoticonPort,
  imageUploadPort,
  children,
  blacklist,
}: {
  controller: ChatRealtimeController;
  userId: string;
  user?: AuthUser | undefined;
  preferences: ChatPreferencesPort;
  redPackets: RedPacketPort;
  luckyBagPort: LuckyBagPort;
  emoticonPort: ChatEmoticonPort;
  imageUploadPort: ChatImageUploadPort;
  children: ReactNode;
  blacklist: BlacklistPort;
}) {
  const avatarPreference = useAvatarPreference(preferences);
  const bubblePreference = useBubblePreference(preferences);
  const luckyBags = useMemo(
    () => createLuckyBagController(luckyBagPort, userId),
    [luckyBagPort, userId],
  );
  const luckyBagCreation = useMemo(
    () => createLuckyBagCreation(luckyBagPort, userId, luckyBags.active.update),
    [luckyBagPort, userId, luckyBags],
  );
  useEffect(() => {
    luckyBags.active.start(controller);
    const refresh = () => {
      if (document.visibilityState === 'visible') void luckyBags.active.load();
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      luckyBags.dispose();
      luckyBagCreation.dispose();
    };
  }, [luckyBags, luckyBagCreation, controller]);
  const imagePreference = useImagePreference(preferences);
  const [geometryScope, setGeometryScope] = useState(() => ({
    userId,
    controller,
    cache: createImageGeometry(),
  }));
  if (geometryScope.userId !== userId || geometryScope.controller !== controller)
    setGeometryScope({ userId, controller, cache: createImageGeometry() });
  const draft = useMemo(() => createChatDraft(userId), [userId]);
  const imageUpload = useMemo(
    () => createImageUploadController(imageUploadPort, userId),
    [imageUploadPort, userId],
  );
  useEffect(() => {
    imageUpload.start();
    return () => imageUpload.dispose();
  }, [imageUpload]);
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
  const navigation = useMemo(() => createMessageNavigation(controller), [controller]);
  useEffect(() => navigation.start(userId, user?.name ?? ''), [navigation, userId, user?.name]);
  const composerRef = useRef<HTMLDivElement>(null);
  const emoticons = useMemo(
    () => createEmoticonController(emoticonPort, userId, imageUploadPort),
    [emoticonPort, userId, imageUploadPort],
  );
  useEffect(() => {
    emoticons.start();
    return () => emoticons.dispose();
  }, [emoticons]);
  return (
    <ChatRealtimeContext.Provider
      value={{
        controller,
        blacklist,
        luckyBags,
        luckyBagCreation,
        navigation,
        user,
        userId,
        avatarPreference,
        bubblePreference,
        imagePreference,
        imageGeometry: geometryScope.cache,
        draft,
        imageUpload,
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
