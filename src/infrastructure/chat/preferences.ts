import type { ChatPreferencesPort } from '@/domain/chat';

export function createLocalChatPreferences(): ChatPreferencesPort {
  const key = 'fish-island:chat:public-group-name';
  const avatarsKey = 'fish-island:chat:show-avatars';
  return {
    readShowAvatars: () => window.localStorage.getItem(avatarsKey) !== 'false',
    writeShowAvatars: (value) => window.localStorage.setItem(avatarsKey, String(value)),
    readGroupName: () => window.localStorage.getItem(key),
    writeGroupName: (name) => window.localStorage.setItem(key, name),
  };
}
