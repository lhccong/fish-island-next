import type { ChatPreferencesPort } from '@/domain/chat';

export function createLocalChatPreferences(): ChatPreferencesPort {
  const key = 'fish-island:chat:public-group-name';
  const avatarsKey = 'fish-island:chat:show-avatars';
  const imagesKey = 'fish-island:chat:defer-images';
  const framesKey = 'fish-island:chat:hide-avatar-frames';
  return {
    readHideAvatarFrames: () => window.localStorage.getItem(framesKey) === 'true',
    writeHideAvatarFrames: (value) => window.localStorage.setItem(framesKey, String(value)),
    readDeferImages: () => window.localStorage.getItem(imagesKey) === 'true',
    writeDeferImages: (value) => window.localStorage.setItem(imagesKey, String(value)),
    readShowAvatars: () => window.localStorage.getItem(avatarsKey) !== 'false',
    writeShowAvatars: (value) => window.localStorage.setItem(avatarsKey, String(value)),
    readGroupName: () => window.localStorage.getItem(key),
    writeGroupName: (name) => window.localStorage.setItem(key, name),
  };
}
