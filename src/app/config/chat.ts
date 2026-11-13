import {
  createChatClient,
  createLocalChatPreferences,
  createChatRealtime,
  createChatHistory,
  createChatSender,
  createRedPacketClient,
  createChatEmoticons,
} from '@/infrastructure/chat';
import { createChatRealtimeController } from '@/features/chat';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';

const vault = createBrowserSessionVault(apiBaseUrl);
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
export const chatService = createChatClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
