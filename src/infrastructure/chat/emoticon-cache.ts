import type { ChatEmoticonPort } from '@/domain/chat';

type Page = Awaited<ReturnType<ChatEmoticonPort['list']>>;
type PendingPage = {
  controller: AbortController;
  result: Promise<Page>;
  readers: number;
};

const pageLimit = 64;

function createPageCache(ttl: number, session: AbortSignal) {
  const pages = new Map<string, { data: Page; expires: number }>();
  const pending = new Map<string, PendingPage>();

  return {
    clear() {
      pages.clear();
      pending.clear();
    },
    async read(
      keyword: string,
      page: number,
      signal: AbortSignal,
      load: (signal: AbortSignal) => Promise<Page>,
      cacheEmpty: boolean,
    ): Promise<Page> {
      signal.throwIfAborted();
      const prefix = `${JSON.stringify(keyword)}:`;
      const key = prefix + page;
      const cached = pages.get(key);
      if (cached) {
        pages.delete(key);
        if (cached.expires > Date.now()) {
          pages.set(key, cached);
          return cached.data;
        }
      }

      let request = pending.get(key);
      if (!request) {
        // A newly loaded first page must not be combined with an older set of continuations.
        if (page === 1) {
          for (const oldKey of pages.keys()) if (oldKey.startsWith(prefix)) pages.delete(oldKey);
          for (const oldKey of pending.keys())
            if (oldKey.startsWith(prefix)) pending.delete(oldKey);
        }
        const controller = new AbortController();
        const requestSignal = AbortSignal.any([controller.signal, session]);
        const result = load(requestSignal)
          .then((data) => {
            requestSignal.throwIfAborted();
            if (pending.get(key)?.controller === controller && (cacheEmpty || data.items.length)) {
              pages.set(key, { data, expires: Date.now() + ttl });
              if (pages.size > pageLimit) pages.delete(pages.keys().next().value!);
            }
            return data;
          })
          .finally(() => {
            if (pending.get(key)?.controller === controller) pending.delete(key);
          });
        request = { controller, result, readers: 0 };
        pending.set(key, request);
      }

      const entry = request;
      entry.readers++;
      return new Promise<Page>((resolve, reject) => {
        const release = () => {
          signal.removeEventListener('abort', cancel);
          entry.readers--;
        };
        const cancel = () => {
          release();
          if (entry.readers === 0) {
            if (pending.get(key) === entry) pending.delete(key);
            entry.controller.abort();
          }
          reject(signal.reason);
        };
        signal.addEventListener('abort', cancel, { once: true });
        void entry.result.then(
          (data) => {
            if (signal.aborted) return;
            release();
            resolve(data);
          },
          (error: unknown) => {
            if (signal.aborted) return;
            release();
            reject(error);
          },
        );
      });
    },
  };
}

export function createCachedChatEmoticons(network: ChatEmoticonPort) {
  const createSession = () => {
    const controller = new AbortController();
    return {
      controller,
      saved: createPageCache(60_000, controller.signal),
      search: createPageCache(300_000, controller.signal),
    };
  };
  let owner = '';
  let session = createSession();

  function sessionSignal(signal: AbortSignal) {
    if (!owner) throw new Error('请登录后使用表情包');
    const combined = AbortSignal.any([signal, session.controller.signal]);
    combined.throwIfAborted();
    return combined;
  }

  async function mutate(signal: AbortSignal, write: (signal: AbortSignal) => Promise<void>) {
    const { saved, controller } = session;
    await write(sessionSignal(signal));
    controller.signal.throwIfAborted();
    saved.clear();
  }

  const port: ChatEmoticonPort = {
    async list(page, signal, keyword = '') {
      return session.saved.read(
        keyword,
        page,
        sessionSignal(signal),
        (request) => network.list(page, request, keyword),
        !keyword, // OCR is asynchronous, so a keyword with no matches should be queried again.
      );
    },
    async search(keyword, page, signal) {
      const word = keyword.endsWith('表情') ? keyword : `${keyword}表情`;
      return session.search.read(
        word,
        page,
        sessionSignal(signal),
        (request) => network.search(keyword, page, request),
        false,
      );
    },
    add: (url, signal) => mutate(signal, (request) => network.add(url, request)),
    remove: (id, signal) => mutate(signal, (request) => network.remove(id, request)),
  };

  return {
    port,
    setOwner(id: string) {
      if (id === owner) return;
      session.controller.abort();
      session.saved.clear();
      session.search.clear();
      owner = id;
      session = createSession();
    },
  };
}
