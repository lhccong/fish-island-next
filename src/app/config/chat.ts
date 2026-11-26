import {
  createChatReport,
  createChatRemarks,
  createChatClient,
  createLocalChatPreferences,
  createChatListPreferences,
  createChatRealtime,
  createChatHistory,
  createChatSender,
  createRedPacketClient,
  createLuckyBagClient,
  createChatEmoticons,
  createCachedChatEmoticons,
  createChatImageUpload,
} from '@/infrastructure/chat';
import { createChatRealtimeController } from '@/features/chat';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
import { gameRealtime } from '@/app/config/game-realtime';
import { drawChannel } from '@/app/config/draw';
import { landlordsChannel } from '@/app/config/landlords';
import { undercoverChannel } from '@/app/config/undercover';
import { broadcastChannel } from '@/app/config/broadcast';

const vault = createBrowserSessionVault(apiBaseUrl);
export const chatReport = createChatReport(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
export const chatLuckyBags = createLuckyBagClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
export const chatRemarks = createChatRemarks(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
export const chatImageUpload = createChatImageUpload(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
const emoticonCache = createCachedChatEmoticons(
  createChatEmoticons(
    apiBaseUrl,
    () => vault.read(),
    () => {
      void authController.restore(true);
    },
  ),
);
export const chatEmoticons = emoticonCache.port;
const syncEmoticonOwner = () => {
  const { session } = authController.store.getState();
  emoticonCache.setOwner(session.status === 'authenticated' ? session.user.id : '');
};
syncEmoticonOwner();
const unsubscribeEmoticonOwner = authController.store.subscribe(syncEmoticonOwner);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    unsubscribeEmoticonOwner();
    emoticonCache.setOwner('');
  });
export const chatRedPackets = createRedPacketClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
export const chatService = createChatClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
export const chatRealtime = createChatRealtimeController(
  createChatRealtime(
    apiBaseUrl,
    () => vault.read(),
    () => {
      void authController.restore(true);
    },
    {
      receive(raw) {
        broadcastChannel.receive(raw);
        gameRealtime.receive(raw);
        undercoverChannel.receive(raw);
        drawChannel.receive(raw);
        landlordsChannel.receive(raw);
      },
      connection(state, send) {
        gameRealtime.connection(state, send);
        undercoverChannel.connection(state, send);
        landlordsChannel.connection(state, send);
        drawChannel.connection(state);
      },
    },
  ),
  createChatHistory(
    apiBaseUrl,
    () => vault.read(),
    () => {
      void authController.restore(true);
    },
  ),
  createChatSender(
    apiBaseUrl,
    () => vault.read(),
    () => {
      void authController.restore(true);
    },
  ),
  chatService,
);
export const chatPreferences = createLocalChatPreferences();
export const chatListPreferences = createChatListPreferences();
