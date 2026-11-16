import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type PointerEvent,
  type RefObject,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';
import styles from './FloatingWindow.module.css';

export function FloatingWindow({
  title,
  hidden,
  onHide,
  onClose,
  children,
  returnFocusRef,
  variant = 'default',
  actionName = '游戏',
  headerAction,
  titleContent,
  appearance = 'default',
  standalone = false,
}: {
  titleContent?: ReactNode;
  appearance?: 'default' | 'worksheet';
  standalone?: boolean;
  headerAction?: ReactNode;
  variant?: 'default' | 'compact';
  actionName?: string;
  title: string;
  hidden: boolean;
  onHide: () => void;
  onClose: () => void;
  children: ReactNode;
  returnFocusRef?: RefObject<HTMLElement | null>;
}) {
  const [maximized, setMaximized] = useState(false);
  const [bounds, setBounds] = useState(() =>
    variant === 'compact'
      ? {
          x: Math.max(0, innerWidth - 384),
          y: Math.max(0, innerHeight - 544),
          width: 360,
          height: 520,
        }
      : { x: 80, y: 70, width: 960, height: 700 },
  );
  const minimumWidth = variant === 'compact' ? 320 : 600;
  const closeRef = useRef<HTMLButtonElement>(null);
  const initialFocus = useRef<HTMLElement | null>(null);
  const returnFocus = returnFocusRef ?? initialFocus;
  useEffect(() => {
    if (!returnFocusRef)
      initialFocus.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = returnFocus.current;
    return () => {
      if (element?.isConnected) element.focus();
    };
  }, [returnFocus, returnFocusRef]);
  useEffect(() => {
    if (!hidden) closeRef.current?.focus();
    else if (returnFocus.current?.isConnected) returnFocus.current.focus();
  }, [hidden, returnFocus]);
  useEffect(() => {
    const clamp = () =>
      setBounds((b) => ({
        ...b,
        x: Math.max(0, Math.min(b.x, innerWidth - Math.min(b.width, innerWidth))),
        y: Math.max(0, Math.min(b.y, innerHeight - Math.min(b.height, innerHeight))),
      }));
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);
  const start = (event: PointerEvent<HTMLElement>, resize: boolean) => {
    if (event.button !== 0 || maximized || standalone || innerWidth <= 760) return;
    const target = event.currentTarget;
    const x = event.clientX,
      y = event.clientY,
      original = bounds;
    target.setPointerCapture(event.pointerId);
    const move = (e: globalThis.PointerEvent) =>
      setBounds(
        resize
          ? {
              ...original,
              width: Math.min(
                Math.max(minimumWidth, original.width + e.clientX - x),
                innerWidth - original.x,
              ),
              height: Math.min(
                Math.max(300, original.height + e.clientY - y),
                innerHeight - original.y,
              ),
            }
          : {
              ...original,
              x: Math.max(
                0,
                Math.min(
                  original.x + e.clientX - x,
                  innerWidth - Math.min(original.width, innerWidth),
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  original.y + e.clientY - y,
                  innerHeight - Math.min(original.height, innerHeight),
                ),
              ),
            },
      );
    const end = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', end);
      target.removeEventListener('pointercancel', end);
      target.removeEventListener('lostpointercapture', end);
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);
    target.addEventListener('lostpointercapture', end);
  };
  return (
    <Dialog.Root open modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          hidden={hidden}
          className={styles.window}
          data-maximized={maximized}
          data-variant={variant}
          data-appearance={appearance}
          data-standalone={standalone}
          style={
            {
              '--window-x': `${bounds.x}px`,
              '--window-y': `${bounds.y}px`,
              '--window-width': `${bounds.width}px`,
              '--window-height': `${bounds.height}px`,
            } as React.CSSProperties
          }
          aria-describedby={undefined}
          aria-labelledby={undefined}
          aria-label={title}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            e.preventDefault();
            if (!hidden && !standalone) onHide();
          }}
        >
          <header className={styles.header}>
            <Dialog.Title asChild>
              <button
                type="button"
                className={styles.title}
                aria-label={`拖动${title}窗口`}
                onPointerDown={(e) => start(e, false)}
                onDoubleClick={() => {
                  if (!standalone) setMaximized(!maximized);
                }}
              >
                {titleContent ?? title}
              </button>
            </Dialog.Title>
            {headerAction}
            <button type="button" aria-label={`收起${actionName}窗口`} onClick={onHide}>
              <Minus size={18} />
            </button>
            <button
              type="button"
              className={styles.maximize}
              aria-label={maximized ? `还原${actionName}窗口` : `最大化${actionName}窗口`}
              onClick={() => setMaximized(!maximized)}
            >
              {maximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              ref={closeRef}
              type="button"
              aria-label={`关闭${actionName}窗口`}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </header>
          <div className={styles.body}>{children}</div>
          <button
            type="button"
            className={styles.resize}
            aria-label={`调整${actionName}窗口大小`}
            onPointerDown={(e) => start(e, true)}
            onKeyDown={(e) => {
              const delta = e.shiftKey ? 80 : 20;
              if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                setBounds((b) => ({
                  ...b,
                  width: Math.min(
                    innerWidth - b.x,
                    Math.max(
                      minimumWidth,
                      b.width +
                        (e.key === 'ArrowRight' ? delta : e.key === 'ArrowLeft' ? -delta : 0),
                    ),
                  ),
                  height: Math.min(
                    innerHeight - b.y,
                    Math.max(
                      300,
                      b.height + (e.key === 'ArrowDown' ? delta : e.key === 'ArrowUp' ? -delta : 0),
                    ),
                  ),
                }));
              }
            }}
          >
            ↘
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
