import { create } from 'zustand';
import { builtinSkins, type BuiltinSkinId, type ColorMode } from '@/skins/builtin';

interface AppearanceState {
  skinId: BuiltinSkinId;
  colorMode: ColorMode;
  setColorMode: (mode: ColorMode) => void;
  setSkinId: (skinId: BuiltinSkinId) => void;
}

const storageKey = 'fish-island:skin';
const modeStorageKey = 'fish-island:color-mode';

function readColorMode(): ColorMode {
  try {
    return localStorage.getItem(modeStorageKey) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

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
  colorMode: readColorMode(),
  setColorMode: (colorMode) => {
    set({ colorMode });
    try {
      localStorage.setItem(modeStorageKey, colorMode);
    } catch {
      /* 存储受限时仍保留当前会话选择。 */
    }
  },
  setSkinId: (skinId) => {
    set({ skinId });
    try {
      localStorage.setItem(storageKey, skinId);
    } catch {
      // 存储受限时仍允许当前会话切换主题。
    }
  },
}));
