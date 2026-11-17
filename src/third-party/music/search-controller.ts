import { createStore } from 'zustand/vanilla';
import { songKey, type MusicPort, type MusicSource, type Song } from './domain';

export function createMusicSearch(port: MusicPort) {
  const store = createStore(() => ({
    source: 'netease' as MusicSource,
    keyword: '',
    items: [] as Song[],
    status: 'idle' as 'idle' | 'loading' | 'ready' | 'error',
    error: '',
    hasMore: false,
  }));
  let request: AbortController | undefined;
  let page = 0;
  let disposed = false;
  async function load() {
    const state = store.getState();
    if (disposed || request || !state.keyword || (page > 0 && !state.hasMore)) return;
    const current = new AbortController();
    request = current;
    store.setState({ status: 'loading', error: '' });
    try {
      const batch = await port.search(state.source, state.keyword, page + 1, current.signal);
      if (current.signal.aborted || disposed) return;
      const unique = new Map(store.getState().items.map((song) => [songKey(song), song]));
      const before = unique.size;
      batch.forEach((song) => unique.set(songKey(song), song));
      page++;
      store.setState({
        items: [...unique.values()].slice(0, 100),
        status: 'ready',
        hasMore: batch.length === 20 && unique.size > before && unique.size < 100,
      });
    } catch (error) {
      if (!current.signal.aborted && !disposed)
        store.setState({
          status: 'error',
          error: error instanceof Error ? error.message : '搜索失败，请稍后重试',
        });
    } finally {
      if (request === current) request = undefined;
    }
  }
  return {
    store,
    load,
    activate() {
      disposed = false;
    },
    search(source: MusicSource, keyword: string) {
      request?.abort();
      request = undefined;
      page = 0;
      store.setState({
        source,
        keyword: keyword.trim().slice(0, 80),
        items: [],
        hasMore: false,
        error: '',
        status: 'idle',
      });
      void load();
    },
    cancel() {
      request?.abort();
      request = undefined;
      if (store.getState().status === 'loading') store.setState({ status: 'ready' });
    },
    dispose() {
      disposed = true;
      request?.abort();
      request = undefined;
    },
  };
}
