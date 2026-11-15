import { createStore } from 'zustand/vanilla';
import { defaultIsland, type IslandData, type IslandPreferencesPort } from '@/domain/my-island';

export function createIslandController(port: IslandPreferencesPort, accountId: string) {
  let data = defaultIsland();
  let error = '';
  try {
    data = port.read(accountId);
  } catch {
    error = '无法读取本机小岛数据，请检查浏览器存储权限。';
  }
  const store = createStore<{
    data: IslandData;
    status: 'saved' | 'saving' | 'error';
    error: string;
  }>(() => ({ data, status: error ? 'error' : 'saved', error }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  let readFailed = !!error;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!dirty) {
      if (readFailed) {
        try {
          const recovered = port.read(accountId);
          readFailed = false;
          store.setState({ data: recovered, status: 'saved', error: '' });
        } catch {
          /* Keep unreadable stored data intact until the user edits or storage recovers. */
        }
      }
      return;
    }
    try {
      port.write(accountId, store.getState().data);
      dirty = false;
      readFailed = false;
      store.setState({ status: 'saved', error: '' });
    } catch {
      store.setState({
        status: 'error',
        error: '未能保存到本机，内容仍保留在当前页面，请释放存储空间后重试。',
      });
    }
  };
  return {
    store,
    flush,
    update(change: Partial<IslandData> | ((data: IslandData) => Partial<IslandData>)) {
      const previous = store.getState().data;
      dirty = true;
      store.setState({
        data: { ...previous, ...(typeof change === 'function' ? change(previous) : change) },
        status: 'saving',
        error: '',
      });
      clearTimeout(timer);
      timer = setTimeout(flush, 400);
    },
    dispose() {
      if (timer !== undefined) flush();
    },
  };
}
export type IslandController = ReturnType<typeof createIslandController>;
