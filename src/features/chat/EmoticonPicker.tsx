import { useState } from 'react';
import { Heart, Search, Smile } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import EmoticonPanel from './EmoticonPanel';
import { EmojiPanel } from './EmojiPanel';
import styles from './EmoticonPanel.module.css';

export default function EmoticonPicker({ onSelect }: { onSelect: () => void }) {
  const [section, setSection] = useState<'emoji' | 'saved' | 'search'>('emoji');
  return (
    <>
      <div className={styles.body}>
        {section === 'emoji' ? (
          <EmojiPanel />
        ) : (
          <EmoticonPanel key={section} search={section === 'search'} onSelect={onSelect} />
        )}
      </div>
      <nav className={styles.tabs} aria-label="表情分类">
        {(
          [
            ['emoji', 'Emoji', Smile],
            ['saved', '我的收藏', Heart],
            ['search', '搜索表情', Search],
          ] as const
        ).map(([id, label, Icon]) => (
          <Button
            key={id}
            variant="secondary"
            aria-label={label}
            aria-pressed={section === id}
            onClick={() => setSection(id)}
          >
            <Icon size={20} aria-hidden="true" />
          </Button>
        ))}
      </nav>
    </>
  );
}
