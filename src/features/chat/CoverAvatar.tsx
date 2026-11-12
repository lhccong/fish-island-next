import { BellRing, BookOpen, Layers3 } from 'lucide-react';
import type { CoverConversation } from './camouflage-conversations';
import styles from './CoverAvatar.module.css';

export function CoverAvatar({ conversation }: { conversation: CoverConversation }) {
  return (
    <span className={styles.avatar} data-kind={conversation.avatar} aria-hidden="true">
      {conversation.avatar === 'group' ? (
        Array.from(conversation.name)
          .slice(0, 4)
          .map((glyph) => (
            <span className={styles.glyph} key={glyph}>
              {glyph}
            </span>
          ))
      ) : conversation.avatar === 'service' ? (
        <Layers3 size={24} />
      ) : conversation.avatar === 'subscription' ? (
        <BookOpen size={24} />
      ) : (
        <BellRing size={24} />
      )}
    </span>
  );
}
