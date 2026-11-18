import { Send } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import type { Song } from './domain';

export function MusicShareButton({
  song,
  onShare,
  current = false,
}: {
  song: Song | null;
  onShare: (song: Song) => void;
  current?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      disabled={!song}
      {...(!current && song ? { 'aria-label': `分享 ${song.name}` } : {})}
      onClick={() => {
        if (song) onShare(song);
      }}
    >
      <Send size={16} aria-hidden="true" />
      {current ? '发送到聊天' : '分享'}
    </Button>
  );
}
