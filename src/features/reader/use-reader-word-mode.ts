import { useLayoutEffect, useRef, useState } from 'react';

interface ReadingAnchor {
  offset: number;
  paragraph?: number;
  fraction?: number;
}

function captureAnchor(viewport: HTMLDivElement | null): ReadingAnchor | null {
  if (!viewport) return null;
  const offset = viewport.scrollTop;
  if (offset === 0) return { offset };

  const top = viewport.getBoundingClientRect().top;
  const paragraphs = viewport.querySelectorAll<HTMLElement>('[data-paragraph]');
  const index = Array.from(paragraphs).findIndex(
    (paragraph) => paragraph.getBoundingClientRect().bottom > top,
  );
  const paragraph = paragraphs[index];
  if (!paragraph) return { offset };
  const bounds = paragraph.getBoundingClientRect();
  return {
    offset,
    paragraph: index,
    fraction: bounds.height ? (top - bounds.top) / bounds.height : 0,
  };
}

function restoreAnchor(viewport: HTMLDivElement, anchor: ReadingAnchor) {
  const paragraph = viewport.querySelector<HTMLElement>(`[data-paragraph="${anchor.paragraph}"]`);
  if (!paragraph) {
    viewport.scrollTop = anchor.offset;
    return;
  }
  const bounds = paragraph.getBoundingClientRect();
  viewport.scrollTop +=
    bounds.top - viewport.getBoundingClientRect().top + bounds.height * (anchor.fraction ?? 0);
}

export function useReaderWordMode(host: HTMLElement) {
  const [active, setActive] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const entryRef = useRef<HTMLButtonElement>(null);
  const exitRef = useRef<HTMLButtonElement>(null);
  const anchorRef = useRef<ReadingAnchor | null>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open === active) return;
    if (active) {
      dialog.append(host);
      dialog.showModal();
      exitRef.current?.focus({ preventScroll: true });
    } else {
      document.body.append(host);
      dialog.close();
      entryRef.current?.focus({ preventScroll: true });
    }
    if (viewportRef.current && anchorRef.current)
      restoreAnchor(viewportRef.current, anchorRef.current);
    anchorRef.current = null;
  }, [active, host]);

  const change = (next: boolean) => {
    anchorRef.current = captureAnchor(viewportRef.current);
    setActive(next);
  };
  return { active, change, dialogRef, viewportRef, entryRef, exitRef };
}
