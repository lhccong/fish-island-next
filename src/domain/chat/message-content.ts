export type MessageContentPart =
  | { kind: 'text'; text: string }
  | { kind: 'image'; url: string }
  | { kind: 'red-packet'; id: string };

export function messageClipboardText(content: string): string {
  return parseMessageContent(content)
    .map((part, index, parts) =>
      part.kind === 'image'
        ? `${index > 0 ? '\n' : ''}${part.url}${index < parts.length - 1 ? '\n' : ''}`
        : part.kind === 'red-packet'
          ? '[红包]'
          : part.text,
    )
    .join('');
}
export function messagePreview(content: string): string {
  const text = parseMessageContent(content)
    .map((part) =>
      part.kind === 'image' ? '[图片]' : part.kind === 'red-packet' ? '[红包]' : part.text,
    )
    .join('');
  const characters = Array.from(text);
  return characters.slice(0, 120).join('') + (characters.length > 120 ? '…' : '');
}

export function chatImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 8192) return null;
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function parseMessageContent(content: string): readonly MessageContentPart[] {
  const parts: MessageContentPart[] = [];
  let position = 0;
  let images = 0;
  let packets = 0;
  for (const match of content.matchAll(/\[(img|redpacket)\]([\s\S]*?)\[\/\1\]/gi)) {
    const image = match[1]!.toLowerCase() === 'img';
    const value = match[2]!.trim();
    const url = image ? chatImageUrl(value) : null;
    if (image ? !url || images >= 12 : packets >= 12 || !/^[a-z0-9_-]{1,128}$/i.test(value))
      continue;
    if (match.index > position)
      parts.push({ kind: 'text', text: content.slice(position, match.index) });
    if (image && url) {
      parts.push({ kind: 'image', url });
      images++;
    } else {
      parts.push({ kind: 'red-packet', id: value });
      packets++;
    }
    position = match.index + match[0].length;
  }
  if (position < content.length) parts.push({ kind: 'text', text: content.slice(position) });
  return parts;
}
