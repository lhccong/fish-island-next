import type { ChatPreferencesPort } from '@/domain/chat';

export function createLocalChatPreferences(): ChatPreferencesPort {
  const key = 'fish-island:chat:public-group-name';
  return {
    readGroupName: () => window.localStorage.getItem(key),
    writeGroupName: (name) => window.localStorage.setItem(key, name),
  };
}
