import { useMemo, useState } from 'react';
import { parseEmojiText, parseInvitationText, parseMusicMessage } from '@/domain/chat';
import { MusicMessage } from './MusicMessage';
import { GameInvitation } from './GameInvitation';
import styles from './MessageText.module.css';

export function MessageText({ text }: { text: string }) {
  const parts = useMemo(() => parseInvitationText(text), [text]);
  const song = useMemo(() => parseMusicMessage(text), [text]);
  if (song) return <MusicMessage song={song} />;
  return parts.map((part, sectionIndex) => {
    if (part.kind === 'invitation')
      return <GameInvitation key={sectionIndex} game={part.game} roomId={part.roomId} />;
    return (
      <span key={sectionIndex}>
        {parseEmojiText(part.text).map((part, index) =>
          part.id ? (
            <EmojiImage key={index} id={part.id} token={part.text} />
          ) : (
            <span key={index}>{part.text}</span>
          ),
        )}
      </span>
    );
  });
}

function EmojiImage({ id, token }: { id: string; token: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span>{token}</span>
  ) : (
    <img
      className={styles.emoji}
      src={`${import.meta.env.BASE_URL}qface/${id}.apng`}
      alt={token}
      loading="lazy"
      width={24}
      height={24}
      onError={() => setFailed(true)}
    />
  );
}
