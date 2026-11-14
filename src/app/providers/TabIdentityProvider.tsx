import { useLayoutEffect } from 'react';
import { useTabIdentityStore } from '@/features/appearance';

export function TabIdentityProvider() {
  const identity = useTabIdentityStore((state) => state.identity);
  useLayoutEffect(() => {
    const previousTitle = document.title;
    document.title = identity.name;
    const links = ['icon', 'shortcut icon', 'apple-touch-icon'].map((rel) => {
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
