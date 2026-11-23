import { useMemo } from 'react';
import type { Book } from '@/domain/reader';
import { plainText } from './plain-text';

export function useReaderChapter(book: Book | undefined) {
  const chapter = book?.chapters.find((entry) => entry.index === book.lastReadChapter);
  const content = chapter?.content ?? '';
  const source = book?.source;
  return useMemo(() => {
    const paragraphs = (source === 'local' ? content : plainText(content))
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      paragraphs,
      characters: paragraphs.reduce((total, line) => total + line.replace(/\s/g, '').length, 0),
    };
  }, [content, source]);
}
