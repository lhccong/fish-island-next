import { useEffect, useRef, useState } from 'react';

interface DocumentPip {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>;
}
export function usePictureInPicture(host: HTMLElement, onError: (message: string) => void) {
  const [active, setActive] = useState(false);
  const windowRef = useRef<Window | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const mountedRef = useRef(false);
  const openingRef = useRef(false);
  const api = (window as unknown as { documentPictureInPicture?: DocumentPip })
    .documentPictureInPicture;
  const supported = typeof api?.requestWindow === 'function' && window.isSecureContext;
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanupRef.current?.();
      windowRef.current?.close();
    };
  }, []);
  const exit = () => {
    windowRef.current?.close();
  };
  const toggle = async () => {
    if (openingRef.current) return;
    if (windowRef.current) {
      exit();
      return;
    }
    if (!supported) {
      onError(
        '当前浏览器不支持文档画中画，请使用 HTTPS 下的桌面 Chrome/Edge；仍可使用页内悬浮阅读。',
      );
      return;
    }
    try {
      openingRef.current = true;
      const pip = await api!.requestWindow({ width: 460, height: 600 });
      if (!mountedRef.current) {
        pip.close();
        return;
      }
      windowRef.current = pip;
      const sync = () => {
        for (const attribute of [...document.documentElement.attributes])
          pip.document.documentElement.setAttribute(attribute.name, attribute.value);
        pip.document.head.querySelectorAll('[data-reader-copy]').forEach((node) => node.remove());
        for (const sheet of document.styleSheets) {
          let copy: HTMLElement;
          try {
            // Inline loaded rules synchronously so production CSS links cannot leave
            // a blank, unstyled reader while the PiP document fetches them again.
            copy = pip.document.createElement('style');
            copy.textContent = [...sheet.cssRules].map((rule) => rule.cssText).join('\n');
          } catch {
            if (!sheet.href) continue;
            const link = pip.document.createElement('link');
            link.rel = 'stylesheet';
            link.href = sheet.href;
            copy = link;
          }
          copy.setAttribute('data-reader-copy', '');
          pip.document.head.append(copy);
        }
      };
      sync();
      pip.document.title = '摸鱼阅读';
      host.setAttribute('data-pip', 'true');
      pip.document.body.append(host);
      const observer = new MutationObserver(sync);
      observer.observe(document.documentElement, { attributes: true });
      observer.observe(document.head, { childList: true, subtree: true, characterData: true });
      const restore = () => {
        observer.disconnect();
        host.removeAttribute('data-pip');
        if (document.body.isConnected) document.body.append(host);
        windowRef.current = null;
        cleanupRef.current = null;
        setActive(false);
      };
      cleanupRef.current = () => {
        observer.disconnect();
        pip.removeEventListener('pagehide', restore);
      };
      pip.addEventListener('pagehide', restore, { once: true });
      setActive(true);
    } catch {
      onError('画中画打开失败，请允许浏览器画中画权限并重试。');
    } finally {
      openingRef.current = false;
    }
  };
  return { active, supported, toggle, exit };
}
