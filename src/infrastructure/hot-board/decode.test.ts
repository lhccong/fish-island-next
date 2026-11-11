import { describe, expect, it } from 'vitest';
import { decodeHotBoard, safeHttpUrl } from './decode';

describe('hot board boundary', () => {
  it('normalizes identifiers, preserves ranks and deduplicates content', () => {
    const sources = decodeHotBoard({
      code: 0,
      data: [
        {
          id: 1,
          name: '知乎',
          categoryName: '社区',
          updateTime: '2026-11-11T10:00:00+08:00',
          data: [
            { title: ' ', url: 'https://example.com/empty' },
            { title: '有效标题', url: 'https://example.com/a', followerCount: 123 },
            { title: '重复链接', url: 'https://example.com/a' },
            { title: '没有链接', url: 'javascript:alert(1)', followerCount: -1 },
          ],
        },
        { id: '1', name: '重复来源', data: [] },
      ],
    });
    expect(sources).toHaveLength(1);
    expect(sources[0]?.id).toBe('1');
    expect(sources[0]?.entries.map((entry) => entry.rank)).toEqual([2, 4]);
    expect(sources[0]?.entries[0]?.heat).toBe(123);
    expect(sources[0]?.entries[1]).toMatchObject({ url: null, heat: null });
  });

  it('handles empty feeds without inventing data', () => {
    expect(decodeHotBoard({ code: 0, data: [] })).toEqual([]);
    expect(
      decodeHotBoard({
        code: 0,
        data: [{ id: 'a', name: '来源', data: null, updateTime: 'invalid' }],
      })[0],
    ).toMatchObject({ entries: [], updatedAt: null });
  });

  it('rejects server errors and malformed successful payloads', () => {
    expect(() => decodeHotBoard({ code: 500, message: '服务维护' })).toThrow('服务维护');
    for (const input of [
      null,
      [],
      { code: 0 },
      { code: 0, data: 'invalid' },
      { code: 0, data: [null] },
    ])
      expect(() => decodeHotBoard(input)).toThrow();
  });

  it('allows only absolute HTTP(S) destinations', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,test', '//example.com', '/a', null])
      expect(safeHttpUrl(url)).toBeNull();
    expect(safeHttpUrl('https://example.com/a')).toBe('https://example.com/a');
  });
});
