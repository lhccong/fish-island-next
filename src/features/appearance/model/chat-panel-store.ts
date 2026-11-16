import { create } from 'zustand';

const storageKey = 'fish-island:chat-panels:v1';
interface ChatPanelPreferences {
  circleCollapsed: boolean;
  membersCollapsed: boolean;
}
const defaults: ChatPanelPreferences = { circleCollapsed: false, membersCollapsed: false };

function readPreferences(): ChatPanelPreferences {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!value || typeof value !== 'object') return defaults;
    const saved = value as Partial<ChatPanelPreferences>;
    return {
      circleCollapsed: typeof saved.circleCollapsed === 'boolean' ? saved.circleCollapsed : false,
      membersCollapsed:
        typeof saved.membersCollapsed === 'boolean' ? saved.membersCollapsed : false,
    };
  } catch {
    return defaults;
  }
}

interface ChatPanelState extends ChatPanelPreferences {
  setCircleCollapsed: (collapsed: boolean) => void;
  setMembersCollapsed: (collapsed: boolean) => void;
}

export const useChatPanelStore = create<ChatPanelState>((set, get) => {
  function save(patch: Partial<ChatPanelPreferences>) {
    const preferences = {
      circleCollapsed: get().circleCollapsed,
      membersCollapsed: get().membersCollapsed,
      ...patch,
    };
    set(preferences);
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      // 存储受限时仍保留当前会话选择。
    }
  }
  return {
    ...readPreferences(),
    setCircleCollapsed: (circleCollapsed) => save({ circleCollapsed }),
    setMembersCollapsed: (membersCollapsed) => save({ membersCollapsed }),
  };
});
