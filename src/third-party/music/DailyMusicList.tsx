import { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { MusicPort, Song } from './domain';
import { MusicSongRows } from './MusicSongRows';
import styles from './Music.module.css';

type DailyState =
  { status: 'loading' } | { status: 'ready'; songs: Song[] } | { status: 'error'; message: string };

export function DailyMusicList({
  port,
  onAdd,
  onShare,
}: {
  port: MusicPort;
  onAdd: (song: Song) => void;
  onShare: (song: Song) => void;
}) {
  const [state, setState] = useState<DailyState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    // StrictMode replays this effect on mount. Let cleanup cancel before issuing a request.
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      void port.daily(controller.signal).then(
        (songs) => {
          if (!controller.signal.aborted) setState({ status: 'ready', songs });
        },
        (error: unknown) => {
          if (!controller.signal.aborted)
            setState({
              status: 'error',
              message: error instanceof Error ? error.message : '每日30首加载失败，请重试',
            });
        },
      );
    });
    return () => controller.abort();
  }, [port, attempt]);

  if (state.status === 'loading') return <LoadingIndicator>正在加载每日30首…</LoadingIndicator>;
  if (state.status === 'error' || !state.songs.length)
    return (
      <div className={styles.dailyError}>
        {state.status === 'error' ? (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        ) : (
          <p className={styles.notice}>今天暂无歌曲，请稍后再试</p>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            setState({ status: 'loading' });
            setAttempt((value) => value + 1);
          }}
        >
          重试
        </Button>
      </div>
    );
  return (
    <div className={styles.list}>
      <MusicSongRows songs={state.songs} onAdd={onAdd} onShare={onShare} />
    </div>
  );
}
