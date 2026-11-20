import { createStore } from 'zustand/vanilla';
import type { BigFishEmoticonKeyword, ChatEmoticonPort, ChatImageUploadPort } from '@/domain/chat';
import { prepareChatImage } from './prepare-image';

type BigFishSearch = { results: Promise<string[]>; retryAfter: number };

export function createEmoticonController(
  port: ChatEmoticonPort,
  ownerId: string,
  imageUpload: ChatImageUploadPort,
) {
  const store = createStore(() => ({ revision: 0, pending: false, feedback: '', error: false }));
  let active: AbortController | null = null;
  let disposed = false;
  let searchRequests = new AbortController();
  const bigFishSearches = new Map<BigFishEmoticonKeyword, BigFishSearch>();

  function searchForBigFish(keyword: BigFishEmoticonKeyword): Promise<string[]> {
    if (disposed) return Promise.resolve([]);
    const cached = bigFishSearches.get(keyword);
    if (cached && Date.now() < cached.retryAfter) return cached.results;

    const search: BigFishSearch = {
      retryAfter: Infinity,
      results: port
        .search(keyword, 1, searchRequests.signal)
        .then(
          ({ items }) => items.map(({ url }) => url).sort(),
          () => [],
        )
        .then((urls) => {
          if (!urls.length) search.retryAfter = Date.now() + 30_000;
          return urls;
        }),
    };
    bigFishSearches.set(keyword, search);
    return search.results;
  }

  async function mutate(
    action: (signal: AbortSignal) => Promise<void>,
    success: string,
    progress = '正在保存表情包…',
  ) {
    if (disposed || active || !ownerId) return;
    const request = new AbortController();
    active = request;
    store.setState({ pending: true, feedback: progress, error: false });
    try {
      await action(request.signal);
      if (!request.signal.aborted)
        store.setState((s) => ({ revision: s.revision + 1, feedback: success }));
    } catch (error) {
      if (!request.signal.aborted)
        store.setState({
          feedback: error instanceof Error ? error.message : '保存失败，请重试',
          error: true,
        });
    } finally {
      if (!request.signal.aborted) store.setState({ pending: false });
      if (active === request) active = null;
    }
  }
  return {
    port,
    store,
    searchForBigFish,
    start() {
      disposed = false;
      if (searchRequests.signal.aborted) searchRequests = new AbortController();
    },
    add: (url: string) => mutate((signal) => port.add(url, signal), '已添加到表情包'),
    upload: (file: File) =>
      mutate(
        async (signal) => {
          const prepared = await prepareChatImage(file, signal);
          signal.throwIfAborted();
          const url = await imageUpload.upload(prepared, signal);
          signal.throwIfAborted();
          store.setState({ feedback: '正在保存表情包…' });
          await port.add(url, signal);
        },
        '已添加到表情包',
        '正在上传表情包…',
      ),
    remove: (id: string) => mutate((signal) => port.remove(id, signal), '已移除表情包'),
    dispose() {
      disposed = true;
      active?.abort();
      active = null;
      searchRequests.abort();
      bigFishSearches.clear();
      store.setState({ pending: false });
    },
  };
}
export type EmoticonController = ReturnType<typeof createEmoticonController>;
