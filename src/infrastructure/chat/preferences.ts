import type { ChatPreferencesPort } from '@/domain/chat';

export function createLocalChatPreferences(): ChatPreferencesPort {
  const key = 'fish-island:chat:public-group-name';
  const avatarsKey = 'fish-island:chat:show-avatars';
  const imagesKey = 'fish-island:chat:defer-images';
  return {
    readDeferImages: () => window.localStorage.getItem(imagesKey) === 'true',
    writeDeferImages: (value) => window.localStorage.setItem(imagesKey, String(value)),
    readShowAvatars: () => window.localStorage.getItem(avatarsKey) !== 'false',
    writeShowAvatars: (value) => window.localStorage.setItem(avatarsKey, String(value)),
    readGroupName: () => window.localStorage.getItem(key),
    writeGroupName: (name) => window.localStorage.setItem(key, name),
  };
}
