import {
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Music2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { MusicPort, Song } from './domain';
import type { MusicPlayer } from './player-controller';
import { MusicContext } from './music-context';

type RuntimeComponent = (typeof import('./MusicRuntime'))['MusicRuntime'];

export function MusicProvider({
  port,
  onShare,
  children,
}: {
  port: MusicPort;
  onShare: (song: Song) => void;
  children: ReactNode;
}) {
  const controller = useRef<MusicPlayer | null>(null);
  const requested = useRef<Song | null>(null);
  const ready = useCallback((player: MusicPlayer | null) => {
    controller.current = player;
    if (player && requested.current) {
      player.playNow(requested.current);
    }
  }, []);
  const [Runtime, setRuntime] = useState<RuntimeComponent | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [open, setOpen] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const load = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    setLoadError(false);
    void import('./MusicRuntime')
      .then((module) => {
        if (mounted.current) setRuntime(() => module.MusicRuntime);
      })
      .catch(() => {
        if (mounted.current) {
          setLoadError(true);
          setOpen(true);
        }
      })
      .finally(() => {
        pending.current = false;
      });
  }, []);
  const trigger = useRef<HTMLElement | null>(null);
  const value = useMemo(
    () => ({
      play: (song: Song) => {
        if (controller.current) controller.current.playNow(song);
        else {
          requested.current = song;
          trigger.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setOpen(true);
          load();
        }
      },
      open: () => {
        trigger.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
        load();
        setOpen(true);
      },
    }),
    [load],
  );
  return (
    <MusicContext.Provider value={value}>
      {children}
      {Runtime ? (
        <Runtime
          port={port}
          open={open}
          onOpenChange={setOpen}
          returnFocusRef={trigger}
          onReady={ready}
          onShare={onShare}
        />
      ) : open ? (
        <Dialog
          title="音乐"
          description="个人独立播放"
          open
          onOpenChange={setOpen}
          returnFocusRef={trigger}
        >
          {loadError ? (
            <div role="alert">
              <p>音乐模块加载失败，请重试</p>
              <Button onClick={load}>重试加载音乐</Button>
            </div>
          ) : (
            <LoadingIndicator>正在加载音乐…</LoadingIndicator>
          )}
        </Dialog>
      ) : null}
    </MusicContext.Provider>
  );
}

export function MusicLauncher() {
  const music = useContext(MusicContext);
  if (!music) return null;
  return (
    <Button variant="secondary" aria-label="音乐点歌" title="音乐点歌" onClick={music.open}>
      <Music2 size={18} aria-hidden="true" />
    </Button>
  );
}
