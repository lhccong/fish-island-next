import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { parseJson, renderJson, supportsJsonTree } from './json-document';

function documentFrom(source: string) {
  const document = parseJson(source);
  if (document.kind !== 'valid') throw new Error('Expected valid JSON');
  return document;
}

describe('JSON tools', () => {
  it('preserves large numbers, duplicate keys, and escapes during whitespace changes', () => {
    const compact = String.raw`{"id":9007199254740993,"id":1e-19,"text":"{\"x\": 1}\\","empty":[]}`;
    const source = documentFrom(`\uFEFF\n ${compact} \t`);
    const indented = renderJson(source, 'formatted', 4);
    expect(indented).toContain('\n    "id": 9007199254740993,');
    expect(indented).toContain('\n    "empty": []\n');
    expect(renderJson(documentFrom(indented), 'compressed', 2)).toBe(compact);
  });

  it('handles scalar roots, rejects invalid JSON, and distinguishes blank input', () => {
    for (const source of ['null', 'false', '0', '""']) {
      const document = documentFrom(source);
      expect(renderJson(document, 'tree', 2)).toBe(source);
      expect(supportsJsonTree(document.value)).toBe(true);
    }
    expect(parseJson('  \n\t')).toEqual({ kind: 'empty' });
    expect(parseJson('{ missingQuotes: true }').kind).toBe('error');
    expect(parseJson('[1,]').kind).toBe('error');
  });

  it('preserves types when converting strings and nested collections to YAML', () => {
    const input = documentFrom(
      '{"null":"null","yes":"true","line":"one\\ntwo","items":[1,false,null]}',
    );
    expect(parse(renderJson(input, 'yaml', 4))).toEqual(input.value);
  });

  it('bounds the tree and prevents excessive indentation in a text result', () => {
    expect(supportsJsonTree(Array.from({ length: 1500 }, () => 0))).toBe(false);
    const input = documentFrom(`${'['.repeat(5000)}0${']'.repeat(5000)}`);
    expect(supportsJsonTree(input.value)).toBe(false);
    expect(() => renderJson(input, 'formatted', 8)).toThrow(RangeError);
    expect(renderJson(input, 'compressed', 8)).toBe(input.source);
  });
});
