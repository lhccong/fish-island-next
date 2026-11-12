import { afterEach, describe, expect, it, vi } from 'vitest';
import { readerService } from './client';
import { createReaderRepository } from './repository';
import { decodeBook, decodeSettings } from './decode';
const connection = { baseUrl: 'https://reader.test/reader3', accessToken: '' };
afterEach(() => vi.unstubAllGlobals());
function response(chunks: string[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(new TextEncoder().encode(chunk)));
        controller.close();
      },
    }),
    { headers: { 'Content-Type': 'text/event-stream' } },
  );
}
describe('reader protocol', () => {
  it('keeps legacy source and author fallbacks for empty metadata', () => {
    const book = decodeBook(
      { name: '测试书', author: '', originName: '', origin: 'source-name', bookUrl: 'book' },
      true,
    );
    expect(book.author).toBe('未知作者');
    expect(book.sourceInfo.name).toBe('source-name');
  });
  it('retains pagination for legacy complete events', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response([
            'data: {"data":[{"bookUrl":"book","origin":"source","name":"测试"}],"lastIndex":4}\n\nevent: complete\n\n',
          ]),
        ),
    );
    const result = await readerService.search(
      connection,
      'test',
      1,
      -1,
      new AbortController().signal,
      vi.fn(),
    );
    expect(result.hasMore).toBe(true);
    expect(result.lastIndex).toBe(4);
  });
  it('preserves legacy themes and strips credentials from service addresses', () => {
    const settings = decodeSettings({
      backgroundColor: '#abcdef',
      fontColor: '#123456',
      apiBaseUrl: 'https://user:pass@reader.test/reader3?accessToken=discard',
      customThemes: [
        {
          id: 'old',
          name: '旧主题',
          backgroundColor: '#123456',
          color: '#abcdef',
          fontSize: 24,
          lineHeight: 2,
        },
      ],
    });
    expect(settings.theme).toBe('legacy-custom');
    expect(settings.apiBaseUrl).toBe('https://reader.test/reader3');
    expect(settings.customThemes[0]!.fontSize).toBe(24);
    expect(settings.customThemes[0]!.fontColor).toBe('#abcdef');
  });
  it('decodes split SSE frames and end events without duplicate books or cover filtering', async () => {
    const data = JSON.stringify({
      data: [{ bookUrl: 'book-1', origin: 'source-1', name: '测试书' }],
      lastIndex: 2,
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          response([
            `da`,
            `ta: ${data}\r`,
            `\n\r\ndata: ${data}\r\n\r\nevent: end\r\ndata: {"lastIndex":3,"isEnd":false}\r\n\r\n`,
          ]),
        ),
    );
    const batch = vi.fn();
    const result = await readerService.search(
      connection,
      '测试',
      1,
      -1,
      new AbortController().signal,
      batch,
    );
    expect(result.books).toHaveLength(1);
    expect(result.books[0]!.cover).toBe('');
    expect(result.hasMore).toBe(true);
    expect(result.lastIndex).toBe(3);
  });
  it('rejects truncated streams and backend failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(['data: {}\n\n'])));
    await expect(
      readerService.search(connection, 'test', 1, -1, new AbortController().signal, vi.fn()),
    ).rejects.toThrow('中断');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })));
    await expect(
      readerService.search(connection, 'test', 1, -1, new AbortController().signal, vi.fn()),
    ).rejects.toThrow('503');
  });
  it('migrates legacy records without persisting credentials or unknown fields', () => {
    const book = decodeBook({
      id: 10,
      title: '旧书',
      source: 'online',
      url: 'book-1',
      cover: 'javascript:alert(1)',
      lastReadChapter: 0,
    });
    expect(book.id).toBe('10');
    expect(book.cover).toBe('');
    expect(book.lastReadChapter).toBe(0);
    const settings = decodeSettings({
      accessToken: 'synthetic-discard',
      fontSize: 999,
      speechVolume: 0,
    });
    expect(settings).not.toHaveProperty('accessToken');
    expect(settings.fontSize).toBe(40);
    expect(settings.speechVolume).toBe(0);
    const data = new Map([['fish-reader-books', JSON.stringify([book])]]);
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    };
    const repo = createReaderRepository(storage);
    const library = repo.load();
    repo.save(library);
    expect(repo.load().books[0]!.title).toBe('旧书');
  });
});
