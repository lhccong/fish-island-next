import { create } from 'zustand';
import { builtinSkins, type BuiltinSkinId } from '@/skins/builtin';

interface AppearanceState {
  skinId: BuiltinSkinId;
  setSkinId: (skinId: BuiltinSkinId) => void;
}

const storageKey = 'fish-island:skin';

function readSkinId(): BuiltinSkinId {
  try {
    const saved = localStorage.getItem(storageKey);
    return builtinSkins.find((skin) => skin.id === saved)?.id ?? 'wechat';
  } catch {
    return 'wechat';
  }
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
  skinId: readSkinId(),
  setSkinId: (skinId) => {
    set({ skinId });
    try {
      localStorage.setItem(storageKey, skinId);
    } catch {
      // 存储受限时仍允许当前会话切换主题。
    }
  },
}));
