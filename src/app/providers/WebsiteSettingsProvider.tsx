import { useLayoutEffect } from 'react';
import { useWebsiteSettingsStore } from '@/features/appearance';

export function WebsiteSettingsProvider() {
  const identity = useWebsiteSettingsStore((state) => state.identity);
  const fontScale = useWebsiteSettingsStore((state) => state.fontScale);
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--ui-font-scale', String(Number(fontScale) / 100));
    return () => {
      root.style.removeProperty('--ui-font-scale');
    };
  }, [fontScale]);
  useLayoutEffect(() => {
    const previousTitle = document.title;
    document.title = identity.name;
    const links = ['icon', 'shortcut icon'].map((rel) => {
      const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      const link = existing ?? document.createElement('link');
      const href = link.getAttribute('href');
      const type = link.getAttribute('type');
      link.rel = rel;
      link.removeAttribute('type');
      link.href = identity.icon;
      if (!existing) document.head.appendChild(link);
      return { link, existing, href, type };
    });
    return () => {
      document.title = previousTitle;
      links.forEach(({ link, existing, href, type }) => {
        if (!existing) link.remove();
        else {
          if (href === null) link.removeAttribute('href');
          else link.setAttribute('href', href);
          if (type !== null) link.setAttribute('type', type);
        }
      });
    };
  }, [identity]);
  return null;
}
