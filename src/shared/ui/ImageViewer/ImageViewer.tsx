import { useRef, useState, type RefObject } from 'react';
import { Dialog } from '@/shared/ui/Dialog';
import { Button } from '@/shared/ui/Button';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import { ImageToolbar } from './ImageToolbar';
import { useImageTransform } from './use-image-transform';
import styles from './ImageViewer.module.css';

export interface PreviewImage {
  url: string;
  alt: string;
}
interface Props {
  images: readonly PreviewImage[];
  initialIndex?: number;
  onClose: () => void;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export function ImageViewer({ images, initialIndex = 0, onClose, returnFocusRef }: Props) {
  const [index, setIndex] = useState(Math.max(0, Math.min(initialIndex, images.length - 1)));
  const [thumbnails, setThumbnails] = useState(false);
  const image = images[index];
  return (
    <Dialog
      open
      title="图片预览"
      hideTitle
      hideDescription
      description="使用工具栏缩放、旋转或切换图片。放大后可拖动，触屏支持双指缩放。左右方向键切图，Esc 关闭。"
      showCloseAction={false}
      className={styles.dialog ?? ''}
      {...(returnFocusRef ? { returnFocusRef } : {})}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ImageCanvas
        key={`${index}:${image?.url ?? ''}`}
        image={image}
        index={index}
        count={images.length}
        thumbnails={thumbnails}
        onNavigate={setIndex}
        onThumbnails={() => setThumbnails((value) => !value)}
        onClose={onClose}
      />
      {thumbnails && images.length > 1 && (
        <div className={styles.thumbnails}>
          <ScrollArea label="图片缩略图" gutter="reserved">
            <div className={styles.grid}>
              {images.map((item, i) => (
                <button
                  key={`${i}:${item.url}`}
                  type="button"
                  className={styles.thumbnail}
                  aria-label={`查看第 ${i + 1} 张图片`}
                  aria-pressed={index === i}
                  onClick={() => setIndex(i)}
                >
                  <img src={item.url} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <span>{i + 1}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </Dialog>
  );
}

function ImageCanvas({
  image,
  index,
  count,
  thumbnails,
  onNavigate,
  onThumbnails,
  onClose,
}: {
  image: PreviewImage | undefined;
  index: number;
  count: number;
  thumbnails: boolean;
  onNavigate: (index: number) => void;
  onThumbnails: () => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const t = useImageTransform(viewport);
  const ready = !!image && status === 'ready';
  return (
    <div
      className={styles.canvasLayout}
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        let handled = true;
        switch (event.key) {
          case 'ArrowLeft':
            if (index > 0) onNavigate(index - 1);
            break;
          case 'ArrowRight':
            if (index < count - 1) onNavigate(index + 1);
            break;
          case '+':
          case '=':
            if (ready) t.changeZoom(t.zoom * 1.25);
            break;
          case '-':
            if (ready) t.changeZoom(t.zoom / 1.25);
            break;
          case '0':
            if (ready) t.reset();
            break;
          case '1':
            if (ready) t.original();
            break;
          case 'r':
          case 'R':
            if (ready) t.rotate();
            break;
          default:
            handled = false;
        }
        if (handled) event.preventDefault();
      }}
    >
      <ImageToolbar
        index={index}
        count={count}
        ready={ready}
        zoom={t.zoom}
        maxZoom={t.maxZoom}
        scale={t.scale}
        thumbnails={thumbnails}
        onNavigate={onNavigate}
        onThumbnails={onThumbnails}
        onZoom={t.changeZoom}
        onFit={t.reset}
        onOriginal={t.original}
        onRotate={t.rotate}
        onOpenOriginal={() => {
          if (image) window.open(image.url, '_blank', 'noopener,noreferrer');
        }}
        onClose={onClose}
      />
      <div
        className={styles.stage}
        ref={viewport}
        data-preview-state={image ? status : 'empty'}
        role="region"
        aria-label="图片画布"
        tabIndex={0}
        onDoubleClick={() => {
          if (ready) {
            if (t.zoom === 1) t.changeZoom(2);
            else t.reset();
          }
        }}
        {...t.gestures}
      >
        {image && status !== 'error' && (
          <img
            key={attempt}
            src={image.url}
            alt={image.alt}
            className={styles.image}
            style={t.imageStyle}
            draggable={false}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={(event) => {
              t.setSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight,
              });
              setStatus('ready');
            }}
            onError={() => setStatus('error')}
          />
        )}
        {!image && (
          <span className={styles.status} role="status">
            暂无可预览的图片
          </span>
        )}
        {image && status === 'loading' && (
          <span className={styles.status} role="status">
            大图加载中…
          </span>
        )}
        {image && status === 'error' && (
          <div className={styles.status} role="alert">
            <span>图片加载失败，请检查网络后重试</span>
            <Button
              variant="secondary"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                t.reset();
                setStatus('loading');
                setAttempt((n) => n + 1);
              }}
            >
              重试加载大图
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
