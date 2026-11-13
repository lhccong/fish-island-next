import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ScrollArea } from '@/shared/ui/ScrollArea';
import styles from './InlineAutocomplete.module.css';

interface Option {
  id: string;
  label: string;
}

// The editable textbox retains focus and owns the active descendant, including on touch.
export function InlineAutocomplete({
  open,
  scope,
  label,
  options,
  onClose,
  onSelect,
  feedback,
  children,
}: {
  open: boolean;
  scope: string;
  label: string;
  options: readonly Option[];
  onClose: () => void;
  onSelect: (id: string) => void;
  feedback?: ReactNode;
  children: (attributes: {
    'aria-autocomplete': 'list';
    'aria-controls': string | undefined;
    'aria-expanded': boolean;
    'aria-activedescendant': string | undefined;
  }) => ReactNode;
}) {
  const id = useId();
  const anchor = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const [cursor, setCursor] = useState({ scope: '', index: 0 });
  const index = Math.min(cursor.scope === scope ? cursor.index : 0, options.length - 1);
  const active = open && index >= 0 ? `${id}-${index}` : undefined;
  useLayoutEffect(() => {
    if (active) document.getElementById(active)?.scrollIntoView({ block: 'nearest' });
  }, [active]);
  return (
    <Popover.Root open={open} onOpenChange={(value) => !value && onClose()} modal={false}>
      <Popover.Anchor asChild>
        <div
          ref={anchor}
          onKeyDownCapture={(event) => {
            if (!open || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            if (event.key === 'Escape' || event.key === 'Tab') {
              if (event.key === 'Escape') event.preventDefault();
              onClose();
            } else if (['ArrowDown', 'ArrowUp'].includes(event.key) && options.length) {
              event.preventDefault();
              setCursor({
                scope,
                index:
                  (index + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length,
              });
            } else if (event.key === 'Enter' && !event.shiftKey && options[index]) {
              event.preventDefault();
              event.stopPropagation();
              onSelect(options[index].id);
            }
          }}
        >
          {children({
            'aria-autocomplete': 'list',
            'aria-controls': open ? id : undefined,
            'aria-expanded': open,
            'aria-activedescendant': active,
          })}
        </div>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content
          role="region"
          aria-label={label}
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          sticky="always"
          hideWhenDetached
          className={styles.panel}
          style={
            {
              '--autocomplete-height': `${Math.min(options.length * 44 + 8, 220)}px`,
            } as CSSProperties
          }
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (event.target instanceof Node && anchor.current?.contains(event.target))
              event.preventDefault();
          }}
        >
          <div className={styles.heading}>{label}</div>
          {feedback}
          <ScrollArea label={`${label}滚动区`} gutter="reserved" className={styles.scroll ?? ''}>
            <div id={id} role="listbox" aria-label={label} className={styles.list}>
              {options.map((option, i) => (
                <button
                  key={option.id}
                  id={`${id}-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === index}
                  tabIndex={-1}
                  className={styles.option}
                  onPointerDown={(event) => {
                    touch.current =
                      event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
                  }}
                  onPointerCancel={() => {
                    touch.current = null;
                  }}
                  onPointerUp={(event) => {
                    const start = touch.current;
                    touch.current = null;
                    if (
                      event.pointerType === 'touch' &&
                      start &&
                      Math.hypot(event.clientX - start.x, event.clientY - start.y) < 10
                    ) {
                      event.preventDefault();
                      onSelect(option.id);
                    }
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </ScrollArea>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
