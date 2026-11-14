import { useState } from 'react';
import { Link } from 'react-router';
import { parseEmojiText } from '@/domain/chat';
import styles from './MessageText.module.css';

export function MessageText({ text }: { text: string }) {
  return text
    .split(/(\[invite\/chess\][a-z0-9_-]{1,64}\[\/invite\])/gi)
    .map((section, sectionIndex) => {
      const invitation = /^\[invite\/chess\]([a-z0-9_-]{1,64})\[\/invite\]$/i.exec(section);
      if (invitation)
        return (
          <Link
            key={sectionIndex}
            to={`/game/piece?roomId=${encodeURIComponent(invitation[1]!)}&mode=online`}
          >
            加入五子棋房间 {invitation[1]}
          </Link>
        );
      return (
        <span key={sectionIndex}>
          {parseEmojiText(section).map((part, index) =>
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
