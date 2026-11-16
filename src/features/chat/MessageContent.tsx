import { memo } from 'react';
import type { MessageContentPart } from '@/domain/chat';
import { MessageImage } from './MessageImage';
import { MessageText } from './MessageText';
import { RedPacketMessage } from './RedPacketMessage';
import { LuckyBagMessage } from './LuckyBagMessage';
import { CompactMessageImage } from './CompactMessageImage';

export const MessageContent = memo(function MessageContent({
  parts,
  accountId,
  compactImages = false,
}: {
  parts: readonly MessageContentPart[];
  accountId: string;
  compactImages?: boolean;
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
          : part.id.length + (part.kind === 'lucky-bag' ? 21 : 23);
    return part.kind === 'text' ? (
      <MessageText key={key} text={part.text} />
    ) : part.kind === 'image' ? (
      compactImages ? (
        <CompactMessageImage key={key} url={part.url} />
      ) : (
        <MessageImage key={key} url={part.url} />
      )
    ) : part.kind === 'lucky-bag' ? (
      <LuckyBagMessage key={`${accountId}:${key}`} id={part.id} />
    ) : (
      <RedPacketMessage key={`${accountId}:${key}`} id={part.id} />
    );
  });
});
