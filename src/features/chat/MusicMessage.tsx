import { useContext } from 'react';
import { Play } from 'lucide-react';
import type { ChatMusicSong } from '@/domain/chat';
import { Button } from '@/shared/ui/Button';
import { MediaDisc } from '@/shared/ui/MediaDisc';
import { MusicPlaybackContext } from './music-playback-context';
import styles from './MusicMessage.module.css';

export function MusicMessage({ song }: { song: ChatMusicSong }) {
  const play = useContext(MusicPlaybackContext);
  return (
    <Button
      variant="secondary"
      className={styles.message ?? ''}
      disabled={!play}
      aria-label={`播放音乐 ${song.name}`}
      onClick={() => play?.(song)}
    >
      <MediaDisc>
        <Play aria-hidden="true" />
      </MediaDisc>
      <span className={styles.info}>
        <strong>{song.name}</strong>
        <span>{song.artist || '未知歌手'}</span>
        <small>
          {play ? (song.source === 'netease' ? '网易云音乐' : 'QQ 音乐') : '音乐播放未启用'}
        </small>
      </span>
    </Button>
  );
}
