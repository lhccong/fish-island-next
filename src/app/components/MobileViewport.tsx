import { useEffect } from 'react';

export function MobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const mobile = window.matchMedia('(max-width: 760px)');
    const clear = () => {
      root.style.removeProperty('--visual-viewport-height');
      root.style.removeProperty('--visual-viewport-top');
    };
    const update = () => {
      if (!mobile.matches) return clear();
      // Keep native pinch zoom independent of the application's layout.
      if (Math.abs(viewport.scale - 1) > 0.01) return;
      root.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
      root.style.setProperty('--visual-viewport-top', `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    mobile.addEventListener('change', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      mobile.removeEventListener('change', update);
      clear();
    };
  }, []);
  return null;
}
