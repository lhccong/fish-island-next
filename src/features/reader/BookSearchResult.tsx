import { BookOpen, Check, ChevronDown, Globe, Plus } from 'lucide-react';
import type { Book } from '@/domain/reader';
import { Button } from '@/shared/ui/Button';
import { plainText } from './plain-text';
import styles from './OnlineSearch.module.css';

export function BookSearchResult({
  book,
  added,
  onAdd,
}: {
  book: Book;
  added: boolean;
  onAdd: () => void;
}) {
  const intro = plainText(book.intro);
  return (
    <article className={styles.card}>
      <div className={styles.cover}>
        <BookOpen size={25} aria-hidden="true" />
        {book.cover && (
          <img
            src={book.cover}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.hidden = true;
            }}
          />
        )}
      </div>
      <div className={styles.details}>
        <h3>{book.title}</h3>
        <p className={styles.author}>
          {[book.author, book.category, book.wordCount].filter(Boolean).join(' · ')}
        </p>
        <span className={styles.source}>
          <Globe size={12} aria-hidden="true" />
          {book.sourceInfo.name}
        </span>
        {book.latestChapterTitle && (
          <p className={styles.latest}>最新：{book.latestChapterTitle}</p>
        )}
        {intro && (
          <>
            <p className={styles.intro}>{intro}</p>
            <details className={styles.introDisclosure}>
              <summary>
                完整简介
                <ChevronDown size={13} aria-hidden="true" />
              </summary>
              <p>{intro}</p>
            </details>
          </>
        )}
      </div>
      <Button
        className={styles.add}
        variant={added ? 'secondary' : 'primary'}
        disabled={added}
        onClick={onAdd}
      >
        {added ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
        {added ? '已在书架' : '加入书架'}
      </Button>
    </article>
  );
}
