import { memo } from 'react';
import type { MessageContentPart } from '@/domain/chat';
import { MessageImage } from './MessageImage';
import { MessageText } from './MessageText';
import { RedPacketMessage } from './RedPacketMessage';

export const MessageContent = memo(function MessageContent({
  parts,
  accountId,
}: {
  parts: readonly MessageContentPart[];
  accountId: string;
}) {
  let offset = 0;
  return parts.map((part) => {
    // Content offsets are stable for this immutable message version, including repeated URLs.
    const key = offset;
    offset +=
      part.kind === 'text'
        ? part.text.length
        : part.kind === 'image'
          ? part.url.length + 11
          : part.id.length + 23;
    return part.kind === 'text' ? (
      <MessageText key={key} text={part.text} />
    ) : part.kind === 'image' ? (
      <MessageImage key={key} url={part.url} />
    ) : (
      <RedPacketMessage key={`${accountId}:${key}`} id={part.id} />
    );
  });
});
