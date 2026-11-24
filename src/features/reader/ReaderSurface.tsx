import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { EyeOff, X } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import type { ReaderController } from './controller';
import { useReader } from './use-reader';
import { ReaderBody } from './ReaderBody';
import { ReaderSettingsPanel } from './ReaderSettingsPanel';
import { ReaderContents } from './ReaderContents';
import { ReaderPageControls } from './ReaderPageControls';
import { usePictureInPicture } from './use-picture-in-picture';
import { useReaderWindow } from './use-reader-window';
import { readingStyle } from './reading-themes';
import { useReaderKeys } from './use-reader-keys';
import { useReaderWordMode } from './use-reader-word-mode';
import { useReaderChapter } from './use-reader-chapter';
import { ReaderWordHeader } from './ReaderWordHeader';
import { ReaderToolbar } from './ReaderToolbar';
import styles from './Reader.module.css';
import wordStyles from './ReaderWord.module.css';

export function ReaderSurface({ controller }: { controller: ReaderController }) {
  const books = useReader(controller, (state) => state.books);
  const activeId = useReader(controller, (state) => state.activeId);
  const settings = useReader(controller, (state) => state.settings);
  const status = useReader(controller, (state) => state.status);
  const error = useReader(controller, (state) => state.error);
  const book = books.find((book) => book.id === activeId);
  const { paragraphs, characters } = useReaderChapter(book);
  const [host] = useState(() => {
    const element = document.createElement('div');
    element.className = styles.host!;
    return element;
  });
  const [dialog, setDialog] = useState<'settings' | 'contents' | null>(() =>
    controller.getState().launch.contents ? 'contents' : null,
  );
  const [notice, setNotice] = useState('');
  const [maximized, setMaximized] = useState(false);
  const chapterKey = book && `${book.id}:${book.lastReadChapter}`;
  const [findOpen, setFindOpen] = useState(false);
  const findTrigger = useRef<HTMLButtonElement>(null);
  const chapterFrame = useRef<HTMLDivElement>(null);
  const geometry = useReaderWindow();
  const onError = setNotice;
  const pip = usePictureInPicture(host, onError);
  const {
    active: wordMode,
    change: changeWordMode,
    dialogRef,
    viewportRef,
    entryRef,
    exitRef,
  } = useReaderWordMode(host);
  useLayoutEffect(() => {
    document.body.append(host);
    return () => host.remove();
  }, [host]);
  useLayoutEffect(() => {
    const frame = chapterFrame.current;
    if (status === 'ready' && frame?.ownerDocument.activeElement === frame)
      viewportRef.current?.focus({ preventScroll: true });
  }, [chapterKey, status, viewportRef]);
  const focusChapter = useCallback(() => chapterFrame.current?.focus({ preventScroll: true }), []);
  const jump = useCallback(
    (index: number) => {
      setFindOpen(false);
      focusChapter();
      void controller.getState().jump(index);
    },
    [controller, focusChapter],
  );
  const chapters = book?.chapters.filter((chapter) => !chapter.isVolume) ?? [];
  const position = chapters.findIndex((chapter) => chapter.index === book?.lastReadChapter);
  const change = useCallback(
    (offset: number) => {
      const state = controller.getState();
      if (state.status === 'loading') return;
      const active = state.books.find((book) => book.id === state.activeId);
      const chapters = active?.chapters.filter((chapter) => !chapter.isVolume) ?? [];
      const position = chapters.findIndex((chapter) => chapter.index === active?.lastReadChapter);
      const next = chapters[position + offset];
      if (next) jump(next.index);
    },
    [controller, jump],
  );
  const hide = useCallback(() => {
    pip.exit();
    const state = controller.getState();
    state.configure({ ...state.settings, study: true });
    state.hide();
  }, [controller, pip]);
  useReaderKeys(
    controller,
    host.ownerDocument.defaultView ?? window,
    dialog !== null,
    hide,
    change,
  );
  if (!book) return null;
  const openDialog = (value: 'settings' | 'contents') => {
    pip.exit();
    setDialog(value);
    window.focus();
  };
  const navigation = (
    <ReaderPageControls
      position={position}
      total={chapters.length}
      loading={status === 'loading'}
      wordMode={wordMode}
      characters={characters}
      onChange={change}
    />
  );
  const closeFind = () => {
    setFindOpen(false);
    findTrigger.current?.focus({ preventScroll: true });
  };
  return (
    <>
      {createPortal(
        <dialog
          ref={dialogRef}
          className={wordStyles.window}
          aria-label="Word模式"
          data-reader-word-window=""
          onCancel={(event) => {
            event.preventDefault();
            changeWordMode(false);
          }}
        />,
        document.body,
      )}
      {createPortal(
        <>
          {!wordMode && !settings.clickThrough && !pip.active && (
            <button
              tabIndex={-1}
              className={styles.backdrop}
              aria-label="关闭背景阅读"
              onClick={() => controller.getState().close()}
            />
          )}
          <section
            role="region"
            aria-label="阅读器"
            className={`${styles.reader} ${wordMode ? wordStyles.reader : ''}`}
            data-maximized={!wordMode && (maximized || !settings.floating)}
            data-study={!wordMode && settings.study}
            data-word-mode={wordMode}
            style={
              {
                ...(wordMode ? {} : readingStyle(settings)),
                '--reader-x': `${geometry.bounds.x}px`,
                '--reader-y': `${geometry.bounds.y}px`,
                '--reader-width': `${geometry.bounds.width}px`,
                '--reader-height': `${geometry.bounds.height}px`,
                '--reader-opacity': settings.opacity,
              } as CSSProperties
            }
            onPointerLeave={(event) => {
              geometry.save();
              if (
                event.pointerType === 'mouse' &&
                settings.quickHide === 'mouseOut' &&
                !dialog &&
                !pip.active &&
                !wordMode
              )
                hide();
            }}
          >
            {wordMode && (
              <ReaderWordHeader exitRef={exitRef} onExit={() => changeWordMode(false)} />
            )}
            <header className={styles.readerHeader} data-word-hidden={wordMode}>
              <button
                className={styles.drag}
                aria-label="拖动阅读窗口"
                onPointerDown={(event) => {
                  if (settings.allowWindowMove && !pip.active && !maximized)
                    geometry.start(event, false);
                }}
                onPointerUp={geometry.save}
              >
                <span>{settings.study ? '工作文档' : book.title}</span>
              </button>
              <ReaderToolbar
                wordEntryRef={entryRef}
                findTrigger={findTrigger}
                findOpen={findOpen && status === 'ready'}
                canFind={status === 'ready' && paragraphs.length > 0}
                loading={status === 'loading'}
                clickThrough={settings.clickThrough}
                pip={pip}
                maximized={maximized}
                onEnterWord={() => changeWordMode(true)}
                onOpenDialog={openDialog}
                onToggleFind={() => setFindOpen(!findOpen)}
                onRefresh={() => {
                  setFindOpen(false);
                  focusChapter();
                  void controller.getState().refresh();
                }}
                onToggleClickThrough={() =>
                  controller
                    .getState()
                    .configure({ ...settings, clickThrough: !settings.clickThrough })
                }
                onToggleMaximized={() => setMaximized(!maximized)}
              />
              <div className={styles.windowActions}>
                <button aria-label="紧急隐藏" onClick={hide}>
                  <EyeOff size={18} />
                </button>
                <button aria-label="关闭阅读器" onClick={() => controller.getState().close()}>
                  <X size={18} />
                </button>
              </div>
            </header>
            {!wordMode && navigation}
            {!wordMode && notice && (
              <div role="status" className={styles.notice}>
                {notice}
                <button aria-label="关闭阅读提示" onClick={() => setNotice('')}>
                  <X size={16} />
                </button>
              </div>
            )}
            <div className={styles.chapterFrame} ref={chapterFrame} tabIndex={-1}>
              {status === 'loading' ? (
                <div className={styles.readerState}>
                  <LoadingIndicator>正在加载章节…</LoadingIndicator>
                </div>
              ) : status === 'error' ? (
                <div role="alert" className={styles.readerState}>
                  <p>{error}</p>
                  <Button
                    onClick={() => {
                      focusChapter();
                      void controller.getState().retry();
                    }}
                  >
                    重试章节
                  </Button>
                </div>
              ) : (
                <ReaderBody
                  key={chapterKey}
                  controller={controller}
                  book={book}
                  settings={settings}
                  enabled={!dialog}
                  onError={onError}
                  viewportRef={viewportRef}
                  wordMode={wordMode}
                  paragraphs={paragraphs}
                  findOpen={findOpen}
                  onCloseFind={closeFind}
                />
              )}
            </div>
            {wordMode && navigation}
            <button
              className={styles.resize}
              data-word-hidden={wordMode}
              aria-label="调整阅读窗口大小"
              onPointerDown={(event) => geometry.start(event, true)}
              onPointerUp={geometry.save}
              onKeyDown={(event) => {
                if (event.key === 'Enter') geometry.reset();
              }}
            >
              ↘
            </button>
          </section>
        </>,
        host,
      )}
      {dialog === 'settings' && (
        <ReaderSettingsPanel controller={controller} onClose={() => setDialog(null)} />
      )}
      {dialog === 'contents' && (
        <ReaderContents
          controller={controller}
          book={book}
          onJump={jump}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
