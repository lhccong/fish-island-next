import { useRef, useState } from 'react';
import { useStore } from 'zustand';
import { Pause, Play, Square, SkipForward, PanelTopOpen } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Popover } from '@/shared/ui/Popover';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { MediaDisc } from '@/shared/ui/MediaDisc';
import type { MusicPlayer } from './player-controller';
import { useMusicOrb } from './use-music-orb';
import styles from './MusicOrb.module.css';

export function MusicOrb({
  player,
  hidden,
  onOpen,
}: {
  player: MusicPlayer;
  hidden: boolean;
  onOpen: (trigger: HTMLElement | null) => void;
}) {
  const { current, status, queue, error } = useStore(player.store);
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { area, style, ...events } = useMusicOrb();
  if (!current) return null;
  return (
    <div className={styles.area} ref={area} hidden={hidden}>
      <div className={styles.anchor} style={style}>
        <Popover
          open={open && !hidden}
          onOpenChange={setOpen}
          label="音乐悬浮播放"
          className={styles.panel ?? ''}
          trigger={
            <Button
              {...events}
              ref={trigger}
              variant="secondary"
              className={styles.orb ?? ''}
              aria-label="音乐悬浮球"
              title={`${current.name} · ${status === 'playing' ? '正在播放' : '音乐控制'}；拖动调整位置，方向键移动`}
            >
              <MediaDisc size="compact" loading={status === 'loading'}>
                {status === 'playing' ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              </MediaDisc>
            </Button>
          }
        >
          <div className={styles.body}>
            <p className={styles.song}>
              <strong>{current.name}</strong>
              <span>{current.artist}</span>
            </p>
            <div className={styles.actions}>
              <Button
                disabled={status === 'loading'}
                onClick={player.toggle}
                aria-label={status === 'playing' ? '悬浮球暂停音乐' : '悬浮球播放音乐'}
              >
                {status === 'playing' ? (
                  <Pause size={16} aria-hidden="true" />
                ) : (
                  <Play size={16} aria-hidden="true" />
                )}
                {status === 'playing' ? '暂停' : '播放'}
              </Button>
              <Button variant="secondary" disabled={!queue.length} onClick={player.next}>
                <SkipForward size={16} aria-hidden="true" />
                下一首
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  onOpen(trigger.current);
                }}
              >
                <PanelTopOpen size={16} aria-hidden="true" />
                打开播放器
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setOpen(false);
                  player.stop();
                }}
              >
                <Square size={16} aria-hidden="true" />
                停止并关闭
              </Button>
            </div>
            {status === 'loading' && <LoadingIndicator compact>正在加载歌曲…</LoadingIndicator>}
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
          </div>
        </Popover>
      </div>
    </div>
  );
}
