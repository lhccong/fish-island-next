import { useStore } from 'zustand';
import { Pause, Play, SkipForward, Send } from 'lucide-react';
import { useState } from 'react';
import type { Song } from './domain';
import { Button } from '@/shared/ui/Button';
import { Slider } from '@/shared/ui/Slider';
import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import type { MusicPlayer } from './player-controller';
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
}: {
  player: MusicPlayer;
  onShare: (song: Song) => void;
}) {
  const [shareFeedback, setShareFeedback] = useState('');
  const { current, queue, status, error, notice, volume } = useStore(player.store);
  return (
    <section className={styles.playback} aria-label="音乐播放控制">
      <div className={styles.now}>
        <strong>{current?.name ?? '还没有播放歌曲'}</strong>
        <span>{current?.artist ?? '点歌后开始播放'}</span>
      </div>
      <Button
        variant="secondary"
        className={styles.share ?? ''}
        disabled={!current}
        onClick={() => {
          if (!current) return;
          try {
            onShare(current);
            setShareFeedback('已提交到聊天，发送结果请在消息中查看');
          } catch (error) {
            setShareFeedback(error instanceof Error ? error.message : '提交失败，请重试');
          }
        }}
      >
        <Send size={16} aria-hidden="true" />
        发送到聊天
      </Button>
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
        <Button variant="secondary" disabled={!queue.length} onClick={player.next}>
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
