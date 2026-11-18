import { Button } from '@/shared/ui/Button';
import { songKey, type Song } from './domain';
import { MusicShareButton } from './MusicShareButton';
import styles from './Music.module.css';

export function MusicSongRows({
  songs,
  onAdd,
  onShare,
}: {
  songs: Song[];
  onAdd: (song: Song) => void;
  onShare: (song: Song) => void;
}) {
  return songs.map((song) => (
    <div className={styles.song} key={songKey(song)}>
      <div className={styles.songInfo}>
        <strong>{song.name}</strong>
        <span>{song.artist}</span>
      </div>
      <div className={styles.songActions}>
        <MusicShareButton song={song} onShare={onShare} />
        <Button variant="secondary" aria-label={`点歌 ${song.name}`} onClick={() => onAdd(song)}>
          点歌
        </Button>
      </div>
    </div>
  ));
}
