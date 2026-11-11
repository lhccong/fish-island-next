import { useEffect, type ReactNode } from 'react';
import { useAppearanceStore } from '@/features/appearance';
import { getBuiltinSkin } from '@/skins/builtin';

export function SkinProvider({ children }: { children: ReactNode }) {
  const skinId = useAppearanceStore((state) => state.skinId);
  useEffect(() => {
    const skin = getBuiltinSkin(skinId);
    const root = document.documentElement;
    root.dataset.skin = skin.id;
    const entries = Object.entries(skin.tokens);
    entries.forEach(([name, value]) => root.style.setProperty(name, value));
    return () => {
      entries.forEach(([name]) => root.style.removeProperty(name));
      delete root.dataset.skin;
    };
  }, [skinId]);
  return children;
}
