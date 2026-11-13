import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './HoverPreview.module.css';

export function HoverPreview({
  label,
  content,
  children,
  disabled = false,
}: {
  label: string;
  content: ReactNode;
  children: (descriptionId: string | undefined) => ReactNode;
  disabled?: boolean;
}) {
  const id = useId();
  const anchor = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const clear = () => clearTimeout(timer.current);
  const close = () => {
    clear();
    setPosition(null);
  };
  const show = () => {
    clear();
    if (disabled) return;
    if (!window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)').matches)
      return;
    timer.current = setTimeout(() => {
      const box = anchor.current?.getBoundingClientRect();
      if (!box) return;
      const width = Math.min(280, innerWidth - 24);
      const height = Math.min(300, innerHeight - 24);
      const preferred =
        innerWidth - box.right >= width + 20 ? box.right + 12 : box.left - width - 12;
      setPosition({
        width,
        height,
        left: Math.max(12, Math.min(preferred, innerWidth - width - 12)),
        top: Math.max(12, Math.min(box.top, innerHeight - height - 12)),
      });
    }, 250);
  };
  const leave = () => {
    clear();
    timer.current = setTimeout(() => setPosition(null), 120);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!position || disabled) return;
    const dismiss = () => {
      clearTimeout(timer.current);
      setPosition(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', escape, true);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', escape, true);
    };
  }, [position, disabled]);
  return (
    <>
      <span
        ref={anchor}
        className={styles.anchor}
        onMouseEnter={(event) => {
          if (event.target instanceof Node && event.currentTarget.contains(event.target)) show();
        }}
        onMouseLeave={leave}
        onFocusCapture={(event) => {
          // React Portal 的菜单聚焦也会沿 React 树冒泡，不能据此重开悬停预览。
          if (event.currentTarget.contains(event.target)) show();
        }}
        onBlurCapture={close}
        onPointerDownCapture={close}
        onContextMenuCapture={close}
      >
        {children(position && !disabled ? id : undefined)}
      </span>
      {position &&
        !disabled &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            aria-label={label}
            className={styles.preview}
            style={position}
            onMouseEnter={clear}
            onMouseLeave={leave}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}
