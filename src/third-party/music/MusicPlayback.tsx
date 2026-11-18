import { useStore } from 'zustand';
import { Pause, Play, SkipForward } from 'lucide-react';
import type { Song } from './domain';
import { Button } from '@/shared/ui/Button';
import { Slider } from '@/shared/ui/Slider';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { MusicPlayer } from './player-controller';
import { MusicShareButton } from './MusicShareButton';
import styles from './Music.module.css';

function time(value: number) {
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
}
function MusicProgress({ player }: { player: MusicPlayer }) {
  const { position, duration } = useStore(player.progress);
  return (
    <Slider
      label="播放进度"
      value={position}
      min={0}
      max={duration || 1}
      disabled={!duration}
      valueText={`${time(position)} / ${time(duration)}`}
      onValueChange={player.seek}
    />
  );
}
export function MusicPlayback({
  player,
  onShare,
  shareFeedback,
}: {
  player: MusicPlayer;
  onShare: (song: Song) => void;
  shareFeedback: string;
}) {
  const {
    current,
    queue,
    status,
    error,
    notice,
    volume,
    recommendationSource,
    recommendationStatus,
    recommendationError,
  } = useStore(player.store);
  return (
    <section className={styles.playback} aria-label="音乐播放控制">
      <div className={styles.playerHeader}>
        <div className={styles.now}>
          <strong title={current?.name}>{current?.name ?? '还没有播放歌曲'}</strong>
          <span title={current?.artist}>{current?.artist ?? '点歌或听今日推荐'}</span>
        </div>
        <MusicShareButton song={current} onShare={onShare} current />
      </div>
      <MusicProgress player={player} />
      <div className={styles.controls}>
        <Button
          onClick={player.toggle}
          disabled={!current || status === 'loading'}
          aria-label={status === 'playing' ? '暂停音乐' : '播放音乐'}
        >
          {status === 'playing' ? (
            <Pause size={16} aria-hidden="true" />
          ) : (
            <Play size={16} aria-hidden="true" />
          )}
          {status === 'playing' ? '暂停' : '播放'}
        </Button>
        <Button
          variant="secondary"
          disabled={!queue.length && (!recommendationSource || recommendationStatus === 'loading')}
          onClick={player.next}
        >
          <SkipForward size={16} aria-hidden="true" />
          下一首
        </Button>
        <div className={styles.volume}>
          <Slider
            label="音量"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            valueText={`${Math.round(volume * 100)}%`}
            onValueChange={(value) => {
              player.volume(value);
            }}
          />
        </div>
      </div>
      {recommendationStatus === 'loading' && (
        <LoadingIndicator compact>正在寻找推荐歌曲…</LoadingIndicator>
      )}
      {recommendationError && (
        <div className={styles.recommendationError}>
          <p role="alert" className={styles.error}>
            {recommendationError}
          </p>
          <Button variant="secondary" onClick={player.retryRecommendations}>
            重试今日推荐
          </Button>
        </div>
      )}
      {status === 'loading' && <LoadingIndicator compact>正在加载歌曲…</LoadingIndicator>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {shareFeedback && (
        <p role="status" className={styles.notice}>
          {shareFeedback}
        </p>
      )}
    </section>
  );
}
