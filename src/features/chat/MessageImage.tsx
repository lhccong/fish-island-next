import { useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from './MessageMedia.module.css';
import ImagePreview from './ChatImagePreview';
import { useChatRealtime } from './realtime-context';

export function MessageImage({ url }: { url: string }) {
  const { imagePreference } = useChatRealtime();
  return imagePreference.deferImages ? (
    <DeferredMessageImage key={url} url={url} />
  ) : (
    <LoadedMessageImage key={url} url={url} />
  );
}

function DeferredMessageImage({ url }: { url: string }) {
  const [revealed, setRevealed] = useState(false);
  return revealed ? (
    <LoadedMessageImage url={url} />
  ) : (
    <span className={styles.deferredImage}>
      <Button
        variant="secondary"
        onClick={(event) => {
          event.stopPropagation();
          setRevealed(true);
        }}
      >
        点击显示图片
      </Button>
    </span>
  );
}

function LoadedMessageImage({ url }: { url: string }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [ratio, setRatio] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [preview, setPreview] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<number | null>(null);
  return (
    <>
      <span
        className={styles.imageFrame}
        data-image-state={state}
        style={ratio ? { width: Math.min(214, 160.5 * ratio), aspectRatio: ratio } : undefined}
      >
        <button
          type="button"
          ref={trigger}
          className={styles.imageTrigger}
          aria-label="放大聊天图片"
          disabled={state !== 'ready'}
          onPointerDown={(event) => {
            touchStart.current = event.pointerType === 'touch' ? performance.now() : null;
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (
              event.detail !== 0 &&
              touchStart.current !== null &&
              performance.now() - touchStart.current >= 500
            )
              return;
            setPreview(true);
          }}
        >
          {state !== 'error' && (
            <img
              key={attempt}
              src={url}
              alt="聊天图片"
              width={320}
              height={240}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth > 0 && naturalHeight > 0) setRatio(naturalWidth / naturalHeight);
                setState('ready');
              }}
              onError={() => setState('error')}
            />
          )}
        </button>
        {state === 'loading' && <span className={styles.imageStatus}>图片加载中…</span>}
        {state === 'error' && (
          <span className={styles.imageStatus}>
            <span>图片加载失败</span>
            <Button
              variant="secondary"
              onClick={() => {
                setAttempt((value) => value + 1);
                setState('loading');
              }}
            >
              重新加载图片
            </Button>
          </span>
        )}
      </span>
      {preview && (
        <ImagePreview url={url} onClose={() => setPreview(false)} returnFocusRef={trigger} />
      )}
    </>
  );
}
