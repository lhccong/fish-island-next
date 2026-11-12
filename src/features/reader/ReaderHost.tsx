import { useCallback, useLayoutEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen,
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
import { usePictureInPicture } from './use-picture-in-picture';
import { useReaderWindow } from './use-reader-window';
import { readingStyle } from './reading-themes';
import { useReaderKeys } from './use-reader-keys';
import styles from './Reader.module.css';

export function ReaderHost({
  controller,
  pageActive,
}: {
  controller: ReaderController;
  pageActive: boolean;
}) {
  const activeId = useReader(controller, (state) => state.activeId);
  const hidden = useReader(controller, (state) => state.hidden);
  const floating = useReader(controller, (state) => state.settings.floating);
  const launch = useReader(controller, (state) => state.launch.version);
  if (!activeId) return null;
  if (hidden || (!floating && !pageActive))
    return (
      <button
        className={styles.resume}
        aria-label="恢复阅读窗口"
        onClick={() => {
          controller.getState().configure({ ...controller.getState().settings, floating: true });
          controller.getState().resume();
        }}
      >
        <BookOpen size={18} />
        继续阅读
      </button>
    );
  return <ReaderSurface key={launch} controller={controller} />;
}
function ReaderSurface({ controller }: { controller: ReaderController }) {
  const books = useReader(controller, (state) => state.books);
  const activeId = useReader(controller, (state) => state.activeId);
  const settings = useReader(controller, (state) => state.settings);
  const status = useReader(controller, (state) => state.status);
  const error = useReader(controller, (state) => state.error);
  const book = books.find((book) => book.id === activeId);
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
        <>
          {!settings.clickThrough && !pip.active && (
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
            className={styles.reader}
            data-maximized={maximized || !settings.floating}
            data-study={settings.study}
            style={
              {
                ...readingStyle(settings),
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
                !pip.active
              )
                hide();
            }}
          >
            <div className={styles.readerTitle}>
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
            <div className={styles.toolbar}>
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
              <button
                aria-label="工作伪装"
                aria-pressed={settings.study}
                onClick={() =>
                  controller.getState().configure({ ...settings, study: !settings.study })
                }
              >
                W
              </button>
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
            {settings.study && (
              <div className={styles.documentRibbon}>
                文件 · 开始 · 插入 · 布局 · 审阅 <span>文档编辑预览</span>
              </div>
            )}
            {notice && (
              <div role="status" className={styles.notice}>
                {notice}
                <button aria-label="关闭阅读提示" onClick={() => setNotice('')}>
                  <X size={16} />
                </button>
              </div>
            )}
            {status === 'loading' ? (
              <p role="status" className={styles.empty}>
                正在加载章节…
              </p>
            ) : status === 'error' ? (
              <div role="alert" className={styles.empty}>
                <p>{error}</p>
                <Button onClick={() => void controller.getState().jump(book.lastReadChapter, true)}>
                  重试章节
                </Button>
              </div>
            ) : (
              <ReaderBody
                key={`${book.id}:${book.lastReadChapter}`}
                controller={controller}
                book={book}
                settings={settings}
                enabled={!dialog}
                onError={onError}
              />
            )}
            <div className={styles.pageControls}>
              <Button
                variant="secondary"
                disabled={position <= 0 || status === 'loading'}
                onClick={() => change(-1)}
              >
                上一章
              </Button>
              <span>
                {Math.max(position + 1, 0)} / {chapters.length}
              </span>
              <Button
                variant="secondary"
                disabled={position < 0 || position >= chapters.length - 1 || status === 'loading'}
                onClick={() => change(1)}
              >
                下一章
              </Button>
            </div>
            <button
              className={styles.resize}
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
