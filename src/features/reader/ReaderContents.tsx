import { useState } from 'react';
import type { Book } from '@/domain/reader';
import { Dialog } from '@/shared/ui/Dialog';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import type { ReaderController } from './controller';
import { plainText } from './plain-text';
import styles from './Reader.module.css';
export function ReaderContents({
  controller,
  book,
  onClose,
}: {
  controller: ReaderController;
  book: Book;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [searchContent, setSearchContent] = useState(false);
  const [reverse, setReverse] = useState(false);
  const filtered = book.chapters.filter((chapter) =>
    (searchContent ? `${chapter.title}\n${plainText(chapter.content || '')}` : chapter.title)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const chapters = reverse ? [...filtered].reverse() : filtered;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`《${book.title}》目录`}
      dismissLabel="关闭章节目录"
      description="搜索目录或已缓存正文；未下载章节不参与正文搜索。"
      className={styles.wideDialog ?? ''}
    >
      <input
        aria-label="筛选章节"
        placeholder="输入章节名或已缓存正文关键词"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className={styles.actions}>
        <Button
          variant="secondary"
          aria-pressed={searchContent}
          onClick={() => setSearchContent(!searchContent)}
        >
          {searchContent ? '搜索已缓存正文' : '搜索章节名'}
        </Button>
        <Button variant="secondary" onClick={() => setReverse(!reverse)}>
          {reverse ? '正序' : '倒序'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            void controller.getState().refresh();
            onClose();
          }}
        >
          刷新目录
        </Button>
      </div>
      <ScrollArea label="章节目录" className={styles.chapterList ?? ''}>
        {chapters.length ? (
          chapters.map((chapter) => (
            <button
              key={chapter.index}
              className={styles.chapter}
              disabled={chapter.isVolume}
              aria-current={chapter.index === book.lastReadChapter ? 'true' : undefined}
              onClick={() => {
                void controller.getState().jump(chapter.index);
                onClose();
              }}
            >
              {chapter.title}
              {chapter.index === book.lastReadChapter ? ' · 当前' : ''}
            </button>
          ))
        ) : (
          <p>没有匹配的章节</p>
        )}
      </ScrollArea>
    </Dialog>
  );
}
