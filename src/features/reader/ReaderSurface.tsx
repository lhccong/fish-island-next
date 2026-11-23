import { LoadingIndicator } from '@/shared/ui/LoadingIndicator';
import { useCallback, useLayoutEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  EyeOff,
  List,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  RefreshCw,
  Settings,
  X,
} from 'lucide-react';
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
      if (next) void state.jump(next.index);
    },
    [controller],
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
            <div className={styles.readerTitle} data-word-hidden={wordMode}>
              <button
                className={styles.drag}
                aria-label="拖动阅读窗口"
                onPointerDown={(event) => {
                  if (settings.allowWindowMove && !pip.active && !maximized)
                    geometry.start(event, false);
                }}
                onPointerUp={geometry.save}
              >
                {settings.study ? '工作文档' : book.title}
              </button>
              <button aria-label="紧急隐藏" onClick={hide}>
                <EyeOff size={18} />
              </button>
              <button aria-label="关闭阅读器" onClick={() => controller.getState().close()}>
                <X size={18} />
              </button>
            </div>
            <div className={styles.toolbar} data-word-hidden={wordMode}>
              <button aria-label="章节目录" onClick={() => openDialog('contents')}>
                <List size={18} />
              </button>
              <button
                aria-label="刷新阅读内容"
                disabled={status === 'loading'}
                onClick={() => void controller.getState().refresh()}
              >
                <RefreshCw size={18} />
              </button>
              <button aria-label="阅读器设置" onClick={() => openDialog('settings')}>
                <Settings size={18} />
              </button>
              <button
                aria-label={pip.active ? '退出画中画' : '画中画'}
                title={pip.supported ? '画中画' : '当前浏览器不支持文档画中画，点击查看说明'}
                onClick={() => void pip.toggle()}
              >
                <PictureInPicture2 size={18} />
              </button>
              {!pip.active && (
                <Button
                  ref={entryRef}
                  className={styles.wordEntry}
                  variant="secondary"
                  onClick={() => {
                    pip.exit();
                    changeWordMode(true);
                  }}
                >
                  Word模式
                </Button>
              )}
              <button
                aria-label="背景点击穿透"
                aria-pressed={settings.clickThrough}
                onClick={() =>
                  controller
                    .getState()
                    .configure({ ...settings, clickThrough: !settings.clickThrough })
                }
              >
                穿透
              </button>
              <button aria-label="切换全屏" onClick={() => setMaximized(!maximized)}>
                {maximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
            {!wordMode && settings.study && (
              <div className={styles.documentRibbon}>
                文件 · 开始 · 插入 · 布局 · 审阅 <span>文档编辑预览</span>
              </div>
            )}
            {!wordMode && notice && (
              <div role="status" className={styles.notice}>
                {notice}
                <button aria-label="关闭阅读提示" onClick={() => setNotice('')}>
                  <X size={16} />
                </button>
              </div>
            )}
            {status === 'loading' ? (
              <div className={styles.readerState}>
                <LoadingIndicator>正在加载章节…</LoadingIndicator>
              </div>
            ) : status === 'error' ? (
              <div role="alert" className={styles.readerState}>
                <p>{error}</p>
                <Button onClick={() => void controller.getState().retry()}>重试章节</Button>
              </div>
            ) : (
              <ReaderBody
                key={`${book.id}:${book.lastReadChapter}`}
                controller={controller}
                book={book}
                settings={settings}
                enabled={!dialog}
                onError={onError}
                viewportRef={viewportRef}
                wordMode={wordMode}
                paragraphs={paragraphs}
              />
            )}
            <ReaderPageControls
              position={position}
              total={chapters.length}
              loading={status === 'loading'}
              wordMode={wordMode}
              characters={characters}
              onChange={change}
            />
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
        <ReaderContents controller={controller} book={book} onClose={() => setDialog(null)} />
      )}
    </>
  );
}
