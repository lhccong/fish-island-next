import { type ClipboardEvent } from 'react';
import type { ForumPort } from '@/domain/forum';
import { useOperation } from './use-operation';
export function useImageUpload(service: ForumPort, onInsert: (url: string) => void) {
  const operation = useOperation();
  function upload(file: File) {
    void operation.run(async (signal) => {
      const url = await service.upload(file, signal);
      if (!signal.aborted) onInsert(url);
    }, '图片已插入');
  }
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const file = Array.from(event.clipboardData.files).find((f) => f.type.startsWith('image/'));
    if (file) {
      event.preventDefault();
      upload(file);
    }
  }
  return { ...operation, upload, onPaste };
}
