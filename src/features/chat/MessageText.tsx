import { useState } from 'react';
import { parseEmojiText } from '@/domain/chat';
import styles from './MessageText.module.css';

export function MessageText({ text }: { text: string }) {
  return parseEmojiText(text).map((part, index) =>
    part.id ? (
      <EmojiImage key={index} id={part.id} token={part.text} />
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
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
