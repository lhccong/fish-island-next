import { stringify } from 'yaml';

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export type JsonMode = 'tree' | 'formatted' | 'compressed' | 'yaml';

export const maxJsonLength = 2 * 1024 * 1024;

type JsonDocument =
  | { kind: 'empty' }
  | { kind: 'error'; message: string }
  | { kind: 'valid'; source: string; value: JsonValue };

export function parseJson(input: string): JsonDocument {
  if (input.length > maxJsonLength) {
    return { kind: 'error', message: '输入过长，请将 JSON 拆成较小的片段后再试。' };
  }
  const source = input.replace(/^\uFEFF/, '');
  if (/^[\t\n\r ]*$/.test(source)) return { kind: 'empty' };
  try {
    return { kind: 'valid', source, value: JSON.parse(source) as JsonValue };
  } catch {
    return { kind: 'error', message: 'JSON 格式有误，请检查引号、逗号和括号。' };
  }
}

export function renderJson(
  document: Extract<JsonDocument, { kind: 'valid' }>,
  mode: JsonMode,
  indent: number,
) {
  if (mode === 'yaml') return stringify(document.value, { indent, lineWidth: 0 });

  // Keep number spelling, duplicate keys, and escapes intact when changing whitespace.
  const tokens = document.source.matchAll(/"[^"\\]*(?:\\.[^"\\]*)*"|[^"\s{}[\],:]+|[{}[\],:]/g);
  const parts: string[] = [];
  const padding = ' '.repeat(indent);
  let depth = 0;
  let previous = '';
  let addedWhitespace = 0;
  for (const [token] of tokens) {
    if (mode === 'compressed') {
      parts.push(token);
      continue;
    }
    const opening = previous === '{' || previous === '[';
    const closing = token === '}' || token === ']';
    if (closing) depth--;
    if ((opening && !closing) || previous === ',' || (closing && !opening)) {
      addedWhitespace += 1 + indent * depth;
      if (addedWhitespace > 4 * maxJsonLength) throw new RangeError('JSON 缩进后内容过长');
      parts.push('\n', padding.repeat(depth));
    }
    parts.push(token);
    if (token === ':') parts.push(' ');
    if (token === '{' || token === '[') depth++;
    previous = token;
  }
  return parts.join('');
}

export function supportsJsonTree(value: JsonValue): boolean {
  let remaining = 1500;
  function visit(node: JsonValue, depth: number): boolean {
    if (--remaining < 0 || depth > 32) return false;
    return (
      node === null ||
      typeof node !== 'object' ||
      Object.values(node).every((child) => visit(child, depth + 1))
    );
  }
  return visit(value, 0);
}
