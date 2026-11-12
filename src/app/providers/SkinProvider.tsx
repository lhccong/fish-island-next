import { useLayoutEffect, type ReactNode } from 'react';
import { useAppearanceStore } from '@/features/appearance';
import { getSkinTokens } from '@/skins/builtin';

export function SkinProvider({ children }: { children: ReactNode }) {
  const skinId = useAppearanceStore((state) => state.skinId);
  const colorMode = useAppearanceStore((state) => state.colorMode);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.skin = skinId;
    root.dataset.colorMode = colorMode;
    root.style.colorScheme = colorMode;
    const entries = Object.entries(getSkinTokens(skinId, colorMode));
    entries.forEach(([name, value]) => root.style.setProperty(name, value));
    return () => {
      entries.forEach(([name]) => root.style.removeProperty(name));
      delete root.dataset.skin;
      delete root.dataset.colorMode;
      root.style.removeProperty('color-scheme');
    };
  }, [skinId, colorMode]);
  return children;
}
