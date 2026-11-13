import { chatImageUrl, type ChatEvent, type ReceivedMessage } from '@/domain/chat';

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function id(value: unknown): string | null {
  if (
    typeof value === 'string' &&
    value.trim() &&
    value.length <= 128 &&
    !['__proto__', 'constructor', 'prototype'].includes(value)
  )
    return value;
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return null;
}

// Ignore unrelated game/system frames. Never fabricate identifiers or timestamps.
export function decodeChatEvent(raw: unknown): ChatEvent | null {
  if (typeof raw !== 'string' || raw.length > 262144) return null;
  let frame: Record<string, unknown> | null;
  try {
    frame = object(JSON.parse(raw));
  } catch {
    return null;
  }
  if (frame?.type === 'userMessageRevoke') {
    const messageId = id(frame.data);
    return messageId ? { type: 'revoke', id: messageId } : null;
  }
  if (frame?.type !== 'chat') return null;
  const message = decodeReceivedMessage(object(frame.data)?.message);
  return message ? { type: 'message', message } : null;
}

export function decodeReceivedMessage(value: unknown): ReceivedMessage | null {
  const message = object(value);
  const sender = object(message?.sender);
  const messageId = id(message?.id);
  const senderId = id(sender?.id);
  const timestamp = message?.timestamp;
  const createdAt =
    typeof timestamp === 'number'
      ? timestamp
      : typeof timestamp === 'string'
        ? Date.parse(timestamp)
        : NaN;
  if (
    !messageId ||
    !senderId ||
    !Number.isFinite(createdAt) ||
    !Number.isFinite(new Date(createdAt).getTime()) ||
    typeof message?.content !== 'string'
  )
    return null;
  const quoted = object(message.quotedMessage);
  const quotedSender = object(quoted?.sender);
  const quoteId = id(quoted?.id);
  return {
    ...(id(message.clientMessageId) ? { clientMessageId: id(message.clientMessageId)! } : {}),
    ...(quoteId && typeof quoted?.content === 'string'
      ? {
          quote: {
            id: quoteId,
            senderName: typeof quotedSender?.name === 'string' ? quotedSender.name : '岛友',
            content: quoted.content,
          },
        }
      : {}),
    id: messageId,
    senderId,
    senderName: typeof sender?.name === 'string' ? sender.name.slice(0, 200) : '岛友',
    senderAvatar: chatImageUrl(sender?.avatar),
    content: message.content,
    createdAt,
    revoked: false,
  };
}
