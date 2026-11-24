import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Book, ReaderSettings } from '@/domain/reader';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { Button } from '@/shared/ui/Button';
import type { ReaderController } from './controller';
import { useSpeech } from './use-speech';
import styles from './Reader.module.css';
import wordStyles from './ReaderWord.module.css';

function scrollParagraph(viewport: HTMLElement | null, index: number) {
  const paragraph = viewport?.querySelector<HTMLElement>(`[data-paragraph="${index}"]`);
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
  viewportRef,
  wordMode,
  paragraphs,
  findOpen,
  onCloseFind,
}: {
  book: Book;
  settings: ReaderSettings;
  controller: ReaderController;
  enabled: boolean;
  onError: (message: string) => void;
  viewportRef: RefObject<HTMLDivElement | null>;
  wordMode: boolean;
  paragraphs: string[];
  findOpen: boolean;
  onCloseFind: () => void;
}) {
  const chapter = book.chapters.find((chapter) => chapter.index === book.lastReadChapter);
  const speech = useSpeech(paragraphs, settings, enabled, onError);
  const initialPosition = useRef(book.lastReadPosition);
  const lastPosition = useRef(book.lastReadPosition);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(0);
  const findInput = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (findOpen) findInput.current?.focus({ preventScroll: true });
  }, [findOpen]);
  const matches = query.trim()
    ? paragraphs.flatMap((text, index) =>
        text.toLowerCase().includes(query.toLowerCase()) ? [index] : [],
      )
    : [];
  useEffect(() => {
    const viewport = viewportRef.current;
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
  }, [book.id, book.lastReadChapter, controller, viewportRef]);
  useEffect(() => {
    if (speech.highlight >= 0) scrollParagraph(viewportRef.current, speech.highlight);
  }, [speech.highlight, viewportRef]);
  const locate = (offset: number) => {
    if (!matches.length) return;
    const next = (found + offset + matches.length) % matches.length;
    setFound(next);
    scrollParagraph(viewportRef.current, matches[next]!);
  };
  return (
    <div className={styles.chapterBody}>
      <div
        hidden={!findOpen || wordMode}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            event.stopPropagation();
            onCloseFind();
          }
        }}
      >
        <div className={styles.findBar}>
          <input
            ref={findInput}
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
      </div>
      {settings.ttsEnabled && (
        <div className={styles.speechControls} data-word-hidden={wordMode}>
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
      <div className={`${styles.bodyWrap} ${wordMode ? wordStyles.body : ''}`}>
        <ScrollArea
          label="章节正文"
          viewportRef={viewportRef}
          gutter={wordMode ? 'reserved' : 'overlay'}
          fillContent={wordMode}
          persistentScrollbar={wordMode}
        >
          <div className={wordMode ? wordStyles.sheet : undefined}>
            <div className={`${styles.prose} ${wordMode ? wordStyles.page : ''}`}>
              <h2>{chapter?.title ?? '目录为空'}</h2>
              {paragraphs.length ? (
                paragraphs.map((text, index) => (
                  <p
                    key={index}
                    data-paragraph={index}
                    data-highlight={
                      !wordMode &&
                      (speech.highlight === index ||
                        (findOpen && query && matches[found] === index))
                        ? 'true'
                        : undefined
                    }
                    onClick={() => {
                      if (!wordMode && settings.ttsEnabled && speech.state !== 'stopped')
                        speech.start(index);
                    }}
                  >
                    {text}
                  </p>
                ))
              ) : (
                <p>暂无正文，请刷新目录或重试。</p>
              )}
              {wordMode && (
                <div className={wordStyles.pageEnd}>
                  <a
                    href="https://book.qq.com"
                    aria-label="QQ阅读首页"
                    target="_blank"
                    rel="noreferrer"
                  >
                    QQ 阅读首页
                  </a>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
