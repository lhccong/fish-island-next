import { useState, type RefObject } from 'react';
import { parseMessageContent } from '@/domain/chat';
import { ImageViewer } from '@/shared/ui/ImageViewer';
import { useChatRealtime } from './realtime-context';

export default function ChatImagePreview({
  url,
  onClose,
  returnFocusRef,
}: {
  url: string;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const { controller } = useChatRealtime();
  const [images] = useState(() => {
    const state = controller.store.getState();
    const urls = state.ids.flatMap((id) => {
      const message = state.messages[id];
      return message && !message.revoked
        ? parseMessageContent(message.content).flatMap((part) =>
            part.kind === 'image' ? [part.url] : [],
          )
        : [];
    });
    if (!urls.includes(url)) urls.push(url);
    return [...new Set(urls)].map((url) => ({ url, alt: '聊天图片大图' }));
  });
  return (
    <ImageViewer
      images={images}
      initialIndex={images.findIndex((image) => image.url === url)}
      onClose={onClose}
      returnFocusRef={returnFocusRef}
    />
  );
}
