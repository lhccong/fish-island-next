import { createChatClient, createLocalChatPreferences } from '@/infrastructure/chat';
import { createBrowserSessionVault } from '@/infrastructure/auth';
import { authController } from '@/app/config/auth';
import { apiBaseUrl } from '@/app/config/api';

const vault = createBrowserSessionVault(apiBaseUrl);
export const chatPreferences = createLocalChatPreferences();
export const chatService = createChatClient(
  apiBaseUrl,
  () => vault.read(),
  () => {
    void authController.restore(true);
  },
);
