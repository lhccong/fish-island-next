export function mentionQuery(text: string, start: number, end = start) {
  if (start !== end) return null;
  const prefix = text.slice(0, start);
  const match = /@([^\s@]*)$/u.exec(prefix);
  if (!match) return null;
  if (match.index > 0 && /[\w.%+\-/]/u.test(prefix[match.index - 1]!)) return null;
  return { start: start - match[1]!.length - 1, end: start, query: match[1]! };
}
