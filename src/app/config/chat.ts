import {
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
  createChatImageUpload,
} from '@/infrastructure/chat';
import { createChatRealtimeController } from '@/features/chat';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';
import { gameRealtime } from '@/app/config/game-realtime';
import { undercoverChannel } from '@/app/config/undercover';

const vault = createBrowserSessionVault(apiBaseUrl);
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
export const chatEmoticons = createChatEmoticons(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
export const chatRedPackets = createRedPacketClient(
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
        gameRealtime.receive(raw);
        undercoverChannel.receive(raw);
      },
      connection(state, send) {
        gameRealtime.connection(state, send);
        undercoverChannel.connection(state, send);
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
);
export const chatPreferences = createLocalChatPreferences();
export const chatListPreferences = createChatListPreferences();
export const chatService = createChatClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
