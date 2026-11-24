import { Button } from '@/shared/ui/Button';
import { BookOpen, FileText, Globe, Minus, Plus } from 'lucide-react';
import styles from './Reader.module.css';
import wordStyles from './ReaderWord.module.css';

export function ReaderPageControls({
  position,
  total,
  loading,
  wordMode,
  characters,
  onChange,
}: {
  position: number;
  total: number;
  loading: boolean;
  wordMode: boolean;
  characters: number;
  onChange: (offset: number) => void;
}) {
  const previous = (
    <Button variant="secondary" disabled={position <= 0 || loading} onClick={() => onChange(-1)}>
      上一章
    </Button>
  );
  const next = (
    <Button
      variant="secondary"
      disabled={position < 0 || position >= total - 1 || loading}
      onClick={() => onChange(1)}
    >
      下一章
    </Button>
  );
  const current = Math.max(position + 1, 0);
  if (wordMode)
    return (
      <div className={`${styles.pageControls} ${wordStyles.footer}`}>
        <div className={wordStyles.status}>
          <span>
            第 {current} 章，共 {total} 章
          </span>
          {characters > 0 && <span>{characters} 个字</span>}
        </div>
        <div className={wordStyles.navigation}>
          {previous}
          {next}
        </div>
        <div className={wordStyles.view} aria-hidden="true">
          <BookOpen size={14} />
          <span className={wordStyles.viewIcon}>
            <FileText size={14} />
          </span>
          <Globe size={14} />
          <Minus size={14} />
          <span className={wordStyles.zoomTrack} />
          <Plus size={14} />
          <span>100%</span>
        </div>
      </div>
    );
  return (
    <div className={`${styles.pageControls} ${styles.chapterNavigation}`}>
      {previous}
      <span>
        {current} / {total}
      </span>
      {next}
    </div>
  );
}
