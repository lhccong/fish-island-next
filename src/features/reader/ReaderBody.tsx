import { useEffect, useMemo, useRef, useState } from 'react';
import type { Book, ReaderSettings } from '@/domain/reader';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import type { ReaderController } from './controller';
import { useSpeech } from './use-speech';
import { plainText } from './plain-text';
import styles from './Reader.module.css';

function scrollParagraph(wrapper: HTMLElement | null, index: number) {
  const viewport = wrapper?.querySelector<HTMLElement>('[data-radix-scroll-area-viewport]');
  const paragraph = wrapper?.querySelector<HTMLElement>(`[data-paragraph="${index}"]`);
  if (viewport && paragraph)
    viewport.scrollTop +=
      paragraph.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      viewport.clientHeight / 3;
}

export function ReaderBody({
  book,
  settings,
  controller,
  enabled,
  onError,
}: {
  book: Book;
  settings: ReaderSettings;
  controller: ReaderController;
  enabled: boolean;
  onError: (message: string) => void;
}) {
  const chapter = book.chapters.find((chapter) => chapter.index === book.lastReadChapter);
  const paragraphs = useMemo(
    () =>
      (book.source === 'local' ? chapter?.content || '' : plainText(chapter?.content || ''))
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    [chapter?.content, book.source],
  );
  const speech = useSpeech(paragraphs, settings, enabled, onError);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initialPosition = useRef(book.lastReadPosition);
  const lastPosition = useRef(book.lastReadPosition);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(0);
  const matches = query.trim()
    ? paragraphs.flatMap((text, index) =>
        text.toLowerCase().includes(query.toLowerCase()) ? [index] : [],
      )
    : [];
  useEffect(() => {
    const viewport = wrapperRef.current?.querySelector<HTMLElement>(
      '[data-radix-scroll-area-viewport]',
    );
    if (!viewport) return;
    viewport.scrollTop = initialPosition.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const save = () =>
      controller.getState().progress(lastPosition.current, book.id, book.lastReadChapter);
    const scroll = () => {
      lastPosition.current = viewport.scrollTop;
      clearTimeout(timer);
      timer = setTimeout(save, 500);
    };
    viewport.addEventListener('scroll', scroll);
    window.addEventListener('pagehide', save);
    return () => {
      clearTimeout(timer);
      save();
      viewport.removeEventListener('scroll', scroll);
      window.removeEventListener('pagehide', save);
    };
  }, [book.id, book.lastReadChapter, controller]);
  useEffect(() => {
    if (speech.highlight >= 0) scrollParagraph(wrapperRef.current, speech.highlight);
  }, [speech.highlight]);
  const locate = (offset: number) => {
    if (!matches.length) return;
    const next = (found + offset + matches.length) % matches.length;
    setFound(next);
    scrollParagraph(wrapperRef.current, matches[next]!);
  };
  return (
    <>
      <div className={styles.findBar}>
        <input
          aria-label="当前章节搜索"
          placeholder="搜索当前章节"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setFound(0);
          }}
        />
        <Button variant="secondary" disabled={!matches.length} onClick={() => locate(-1)}>
          上处
        </Button>
        <Button variant="secondary" disabled={!matches.length} onClick={() => locate(1)}>
          下处
        </Button>
        {query && <small>{matches.length} 处</small>}
      </div>
      {settings.ttsEnabled && (
        <div className={styles.actions}>
          <Button
            variant="secondary"
            disabled={!enabled || !paragraphs.length}
            onClick={speech.toggle}
          >
            {speech.state === 'speaking'
              ? '暂停朗读'
              : speech.state === 'paused'
                ? '继续朗读'
                : '开始朗读'}
          </Button>
          <Button variant="secondary" onClick={speech.stop}>
            停止朗读
          </Button>
        </div>
      )}
      <div ref={wrapperRef} className={styles.bodyWrap}>
        <ScrollArea label="章节正文" className={styles.bodyScroll ?? ''}>
          <div className={styles.prose}>
            <h2>{chapter?.title ?? '目录为空'}</h2>
            {paragraphs.length ? (
              paragraphs.map((text, index) => (
                <p
                  key={index}
                  data-paragraph={index}
                  data-highlight={
                    speech.highlight === index || (query && matches[found] === index)
                      ? 'true'
                      : undefined
                  }
                  onClick={() => {
                    if (settings.ttsEnabled && speech.state !== 'stopped') speech.start(index);
                  }}
                >
                  {text}
                </p>
              ))
            ) : (
              <p>暂无正文，请刷新目录或重试。</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
