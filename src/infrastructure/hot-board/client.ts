import type { HotBoardPort } from '@/domain/hot-board';
import { decodeHotBoard } from './decode';

export function createHotBoardClient(baseUrl: string): HotBoardPort {
  const endpoint = `${baseUrl.replace(/\/$/, '')}/api/hot/list`;
  return {
    async load(signal) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          credentials: 'omit',
          signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
        });
        if (!response.ok) throw new Error(`热榜服务暂不可用（HTTP ${response.status}）`);
        const payload: unknown = await response.json();
        return decodeHotBoard(payload);
      } catch (error) {
        if (signal.aborted) throw error;
        if (error instanceof DOMException && error.name === 'TimeoutError')
          throw new Error('请求超时，请检查网络后重试');
        if (error instanceof TypeError) throw new Error('网络连接失败，请检查网络后重试');
        throw error;
      }
    },
  };
}
