import {
  defaultChatListAppearance,
  parseChatListAppearance,
  type ChatListPreferencesPort,
} from '@/domain/chat';

export function createChatListPreferences(): ChatListPreferencesPort {
  const key = 'fish-island:chat:list-appearance';
  return {
    read() {
      const raw = window.localStorage.getItem(key);
      return raw === null ? defaultChatListAppearance() : parseChatListAppearance(JSON.parse(raw));
    },
    write(value) {
      window.localStorage.setItem(key, JSON.stringify(parseChatListAppearance(value)));
    },
  };
}
