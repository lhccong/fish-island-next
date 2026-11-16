import { useMemo, useState } from 'react';
import { parseEmojiText, parseInvitationText } from '@/domain/chat';
import { GameInvitation } from './GameInvitation';
import styles from './MessageText.module.css';

export function MessageText({ text }: { text: string }) {
  const parts = useMemo(() => parseInvitationText(text), [text]);
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
