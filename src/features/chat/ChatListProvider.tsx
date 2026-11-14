import { useState, type ReactNode } from 'react';
import {
  defaultChatListAppearance,
  parseChatListAppearance,
  type ChatListPreferencesPort,
  type ChatListAppearance,
} from '@/domain/chat';
import { ChatListContext } from './chat-list-context';

export function ChatListProvider({
  preferences,
  children,
}: {
  preferences: ChatListPreferencesPort;
  children: ReactNode;
}) {
  const [state, setState] = useState(() => {
    try {
      return { appearance: preferences.read(), readError: '' };
    } catch {
      return {
        appearance: defaultChatListAppearance(),
        readError: '无法读取本地列表设置，可重新编辑并保存',
      };
    }
  });
  function save(value: ChatListAppearance) {
    const appearance = parseChatListAppearance(value);
    try {
      preferences.write(appearance);
    } catch {
      throw new Error('本地保存失败，请检查浏览器存储权限后重试');
    }
    setState({ appearance, readError: '' });
  }
  return <ChatListContext.Provider value={{ ...state, save }}>{children}</ChatListContext.Provider>;
}
