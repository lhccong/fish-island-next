import { useCallback, useState, type RefObject } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { MusicPort, Song } from './domain';
import { createMusicPlayer, type MusicPlayer } from './player-controller';
import { MusicOrb } from './MusicOrb';
import { MusicSearch } from './MusicSearch';
import { MusicPlayback } from './MusicPlayback';
import styles from './Music.module.css';

export function MusicRuntime({
  port,
  open,
  onOpenChange,
  returnFocusRef,
  onReady,
  onShare,
}: {
  port: MusicPort;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  onReady: (player: MusicPlayer | null) => void;
  onShare: (song: Song) => void;
}) {
  const [player, setPlayer] = useState<ReturnType<typeof createMusicPlayer> | null>(null);
  const attachAudio = useCallback(
    (audio: HTMLAudioElement | null) => {
      if (!audio) return;
      const instance = createMusicPlayer(port, audio);
      setPlayer(instance);
      onReady(instance);
      return () => {
        onReady(null);
        instance.dispose();
      };
    },
    [port, onReady],
  );
  return (
    <>
      <audio ref={attachAudio} preload="none" hidden aria-hidden="true" />
      {player && (
        <MusicOrb
          player={player}
          hidden={open}
          onOpen={(element) => {
            returnFocusRef.current = element;
            onOpenChange(true);
          }}
        />
      )}
      <Dialog
        title="音乐"
        description="个人独立播放"
        open={open}
        onOpenChange={onOpenChange}
        hideDescription
        showCloseAction={false}
        dismissLabel="关闭音乐"
        className={styles.dialog ?? ''}
        returnFocusRef={returnFocusRef}
      >
        {player ? (
          <>
            <MusicSearch port={port} player={player} open={open} />
            <MusicPlayback player={player} onShare={onShare} />
          </>
        ) : (
          <LoadingIndicator>正在准备播放器…</LoadingIndicator>
        )}
      </Dialog>
    </>
  );
}
