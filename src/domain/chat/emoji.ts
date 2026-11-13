import { qqFaceIds } from './qq-face-ids';

export function parseEmojiText(text: string): Array<{ text: string; id?: string }> {
  const parts: Array<{ text: string; id?: string }> = [];
  let offset = 0;
  for (const match of text.matchAll(/\[qqface:(\d{1,4})\]/g)) {
    if (!qqFaceIds.has(match[1]!)) continue;
    if (match.index > offset) parts.push({ text: text.slice(offset, match.index) });
    parts.push({ text: match[0], id: match[1]! });
    offset = match.index + match[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
}
