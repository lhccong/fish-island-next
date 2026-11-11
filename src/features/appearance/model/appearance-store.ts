import { create } from 'zustand';
import type { BuiltinSkinId } from '@/skins/builtin';

interface AppearanceState {
  skinId: BuiltinSkinId;
  setSkinId: (skinId: BuiltinSkinId) => void;
}

// 初始化只管理内存中的配色预览；持久化和皮肤包导入后续单独实现。
export const useAppearanceStore = create<AppearanceState>((set) => ({
  skinId: 'wechat',
  setSkinId: (skinId) => set({ skinId }),
}));
