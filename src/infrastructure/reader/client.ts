import type { Book, ReaderConnection, ReaderService, SearchPage } from '@/domain/reader';
import { decodeBook, decodeChapters, record } from './decode';

function endpoint(connection: ReaderConnection, path: string) {
  const url = new URL(`${connection.baseUrl.replace(/\/$/, '')}/${path}`);
  if (!['https:', 'http:'].includes(url.protocol))
    throw new Error('请输入 HTTP 或 HTTPS 阅读服务地址');
  if (connection.accessToken) url.searchParams.set('accessToken', connection.accessToken);
  return url;
}
async function post(
  connection: ReaderConnection,
  path: string,
  body: unknown,
  signal: AbortSignal,
) {
  const response = await fetch(endpoint(connection, path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
    referrerPolicy: 'no-referrer',
  });
  if (!response.ok) throw new Error(`阅读服务请求失败（${response.status}）`);
  const payload = record(await response.json());
  if (payload.isSuccess === false || payload.data === undefined || payload.data === null)
    throw new Error('阅读服务未返回有效数据，请检查服务配置或重试');
  return payload.data;
}
export function mergeBooks(books: Book[], incoming: Book[]) {
  const seen = new Set(books.map((book) => `${book.sourceInfo.url}::${book.url || book.id}`));
  return [
    ...books,
    ...incoming.filter((book) => {
      const key = `${book.sourceInfo.url}::${book.url || book.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}
export const readerService: ReaderService = {
  async chapters(connection, book, refresh, signal) {
    return decodeChapters(
      await post(
        connection,
        'getChapterList',
        { url: book.url, refresh: refresh ? 1 : 0, bookSourceUrl: book.sourceInfo.url },
        signal,
      ),
    );
  },
  async content(connection, book, chapter, signal) {
    const value = await post(
      connection,
      'getBookContent',
      { url: book.url, index: chapter.index },
      signal,
    );
    if (typeof value !== 'string') throw new Error('章节正文格式错误');
    return value;
  },
  async search(connection, keyword, page, lastIndex, signal, onBatch) {
    const url = endpoint(connection, 'searchBookMultiSSE');
    for (const [key, value] of Object.entries({
      key: keyword,
      bookSourceUrl: '',
      bookSourceGroup: '',
      concurrentCount: '8',
      lastIndex: String(lastIndex),
      page: String(page),
    }))
      url.searchParams.set(key, value);
    const response = await fetch(url, {
      signal,
      headers: { Accept: 'text/event-stream' },
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok || !response.body) throw new Error(`搜索服务不可用（${response.status}）`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let ended = false;
    let result: SearchPage = { books: [], lastIndex, hasMore: false };
    const consume = (block: string) => {
      const lines = block.split('\n');
      const event =
        lines
          .find((line) => line.startsWith('event:'))
          ?.slice(6)
          .trim() || 'message';
      const raw = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (event === 'complete') {
        result = { ...result, hasMore: result.books.length > 0 };
        onBatch(result);
        ended = true;
        return;
      }
      if (!raw.trim()) return;
      const payload = record(JSON.parse(raw));
      if (event === 'error' || payload.isSuccess === false)
        throw new Error('书源搜索失败，请重试或检查服务配置');
      const batch = Array.isArray(payload.data)
        ? payload.data.map((item) => decodeBook(item, true))
        : [];
      result = {
        books: mergeBooks(result.books, batch),
        lastIndex: typeof payload.lastIndex === 'number' ? payload.lastIndex : result.lastIndex,
        hasMore: payload.isEnd === false,
      };
      onBatch(result);
      if (event === 'end') ended = true;
    };
    try {
      while (!ended) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        buffer = buffer.replace(/\r\n/g, '\n');
        let boundary: number;
        while ((boundary = buffer.indexOf('\n\n')) >= 0 && !ended) {
          consume(buffer.slice(0, boundary));
          buffer = buffer.slice(boundary + 2);
        }
        if (done) {
          if (buffer.trim() && !ended) consume(buffer);
          break;
        }
      }
      if (!ended) throw new Error('搜索连接提前中断，请重试');
      return result;
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  },
};
