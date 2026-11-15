import { useEffect, useState } from 'react';

export function useViewerSize(size: { width: number; height: number }, thumbnails: boolean) {
  const [viewport, setViewport] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const resize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const mobile = viewport.width <= 760;
  const toolbar = mobile ? 102 : 53;
  const gallery = thumbnails ? Math.min(180, viewport.height * 0.25) : 0;
  const frame = 18;
  const maxWidth = Math.min(960, viewport.width - (mobile ? 24 : 48));
  const maxHeight = viewport.height - (mobile ? 48 : 96);
  const scale = Math.min(
    1,
    (maxWidth - frame) / size.width,
    Math.max(1, maxHeight - toolbar - gallery - frame) / size.height,
  );
  return {
    width: Math.min(maxWidth, Math.max(mobile ? 304 : 572, size.width * scale + frame)),
    height: Math.min(maxHeight, Math.max(160, size.height * scale) + toolbar + gallery + frame),
  };
}
