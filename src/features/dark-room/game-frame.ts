const saveKey = 'fish-island:dark-room-save';
const maxSaveLength = 1_000_000;
const themeTokens = [
  '--color-canvas',
  '--color-surface',
  '--color-text',
  '--color-muted',
  '--color-border',
  '--color-hover',
  '--color-accent',
  '--color-accent-soft',
  '--color-accent-text',
  '--color-action',
  '--color-action-hover',
  '--color-on-accent',
  '--color-overlay',
  '--color-scrollbar',
  '--color-scrollbar-hover',
  '--radius-control',
  '--radius-panel',
  '--shadow-panel',
  '--ui-font-scale',
] as const;

export function readTheme() {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  return {
    mode: root.dataset.colorMode === 'dark' ? 'dark' : 'light',
    mobile: window.matchMedia('(max-width: 760px)').matches,
    tokens: Object.fromEntries(themeTokens.map((name) => [name, style.getPropertyValue(name)])),
  };
}

export function connectGame(
  game: Window,
  handlers: {
    ready: () => void;
    failed: () => void;
    reloading: () => void;
    escape: () => void;
    storageError: () => void;
  },
) {
  const { port1, port2 } = new MessageChannel();
  const resources = new AbortController();
  let save: string | null = null;
  try {
    save = localStorage.getItem(saveKey);
  } catch {
    handlers.storageError();
  }

  const sendAudio = async (name: string) => {
    let bytes: ArrayBuffer | null = null;
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}dark-room/vendor/audio/${name}`, {
        credentials: 'omit',
        signal: resources.signal,
      });
      if (response.ok) bytes = await response.arrayBuffer();
    } catch {
      // The original engine handles missing audio independently of gameplay.
    }
    if (!resources.signal.aborted)
      port1.postMessage({ type: 'audio', name, bytes }, bytes ? [bytes] : []);
  };

  port1.onmessage = ({ data }: MessageEvent<unknown>) => {
    if (!data || typeof data !== 'object' || !('type' in data)) return;
    if (data.type === 'ready') handlers.ready();
    if (data.type === 'error') handlers.failed();
    if (data.type === 'escape') handlers.escape();
    if (data.type === 'reload') {
      handlers.reloading();
      port1.postMessage({ type: 'reload' });
    }
    if (
      data.type === 'audio' &&
      'name' in data &&
      typeof data.name === 'string' &&
      /^[a-z0-9-]+\.flac$/.test(data.name)
    ) {
      void sendAudio(data.name);
    }
    if (data.type !== 'save' || !('value' in data)) return;
    const value = data.value;
    if (typeof value !== 'string' || value.length > maxSaveLength) return;
    try {
      localStorage.setItem(saveKey, value);
    } catch {
      handlers.storageError();
    }
  };
  game.postMessage({ type: 'dark-room-start', save, theme: readTheme() }, '*', [port2]);

  return {
    setTheme: (theme: ReturnType<typeof readTheme>) => port1.postMessage({ type: 'theme', theme }),
    close: () => {
      resources.abort();
      port1.close();
    },
  };
}
