import type { VirtuosoHandle } from 'react-virtuoso';

export interface MessageReadingAnchor {
  id: string;
  top: number;
}

export function captureReadingAnchor(viewport: HTMLElement): MessageReadingAnchor | null {
  const top = viewport.getBoundingClientRect().top;
  const row = Array.from(viewport.querySelectorAll<HTMLElement>('[data-message-id]')).find(
    (element) => element.getBoundingClientRect().bottom > top,
  );
  return row ? { id: row.dataset.messageId!, top: row.getBoundingClientRect().top - top } : null;
}

export function readingAnchorOffset(viewport: HTMLElement, anchor: MessageReadingAnchor): number {
  const row = viewport.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(anchor.id)}"]`);
  return row
    ? row.getBoundingClientRect().top - viewport.getBoundingClientRect().top - anchor.top
    : 0;
}

export function scrollToLatest(viewport: HTMLElement, list: VirtuosoHandle | null, id?: string) {
  if (!viewport.clientHeight) return;
  if (id && !viewport.querySelector(`[data-message-id="${CSS.escape(id)}"]`))
    list?.scrollToIndex({ index: 'LAST', align: 'end', behavior: 'auto' });
  else if (viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight > 1)
    list?.scrollTo({ top: viewport.scrollHeight, behavior: 'auto' });
}
