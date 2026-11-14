import type { AuthUser } from '@/domain/auth';
import type { LuckyBagController } from './lucky-bag-controller';
import type { LuckyBagCreation } from './lucky-bag-creation';
import { createContext, useContext, type RefObject } from 'react';
import type { ChatDraft } from './chat-draft';
import type { ImageUploadController } from './image-upload-controller';
import type { EmoticonController } from './emoticon-controller';
import type { RedPacketController } from './red-packet-controller';
import type { RedPacketCreation } from './red-packet-creation';
import type { ChatRealtimeController } from './realtime-controller';
import type { useAvatarPreference } from './use-avatar-preference';
import type { useImagePreference } from './use-image-preference';

import type { MessageNavigation } from './message-navigation';

export const ChatRealtimeContext = createContext<{
  controller: ChatRealtimeController;
  luckyBags: LuckyBagController;
  luckyBagCreation: LuckyBagCreation;
  navigation: MessageNavigation;
  userId: string;
  user?: AuthUser | undefined;
  avatarPreference: ReturnType<typeof useAvatarPreference>;
  imagePreference: ReturnType<typeof useImagePreference>;
  draft: ChatDraft;
  imageUpload: ImageUploadController;
  emoticons: EmoticonController;
  packets: RedPacketController;
  packetCreation: RedPacketCreation;
  composerRef: RefObject<HTMLDivElement | null>;
} | null>(null);
export function useChatRealtime() {
  const value = useContext(ChatRealtimeContext);
  if (!value) throw new Error('缺少聊天实时上下文');
  return value;
}
