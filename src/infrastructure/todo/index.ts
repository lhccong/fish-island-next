import { AuthError, type SessionToken } from '@/domain/auth';
import type { TodoPort, TodoTask } from '@/domain/todo';
import { decodeTodoSnapshot } from './snapshot';

export function createTodoClient(
  baseUrl: string,
  credential: () => SessionToken | null,
  onUnauthorized: () => void,
): TodoPort {
  const url = baseUrl.replace(/\/+$/, '') + '/api/todo';

  async function request(
    path: 'get' | 'save',
    token: SessionToken | null,
    signal: AbortSignal,
    records?: unknown[],
  ) {
    try {
      signal.throwIfAborted();
      if (!token) throw new AuthError('unauthorized', '请先登录');
      const headers = new Headers({ [token.name]: token.value });
      if (records) headers.set('Content-Type', 'application/json');
      const response = await fetch(`${url}/${path}`, {
        method: 'POST',
        headers,
        credentials: 'include',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(records ? { body: JSON.stringify({ todoData: records }) } : {}),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok) throw new Error('待办服务暂不可用，请重试');
      const envelope: unknown = await response.json();
      if (!envelope || typeof envelope !== 'object' || !('code' in envelope)) {
        throw new Error('待办服务响应格式错误');
      }
      const data = 'data' in envelope ? envelope.data : undefined;
      if (envelope.code === 40100 || (path === 'save' && (data === -1 || data === '-1'))) {
        throw new AuthError('unauthorized', '登录已过期，请重新登录');
      }
      if (envelope.code !== 0) throw new Error('待办服务暂不可用，请重试');
      return data;
    } catch (error) {
      if (error instanceof AuthError && !signal.aborted) onUnauthorized();
      throw error;
    }
  }

  return {
    async load(signal) {
      const token = credential();
      let snapshot = decodeTodoSnapshot(await request('get', token, signal));
      return {
        tasks: snapshot.tasks,
        async save(tasks: readonly TodoTask[], saveSignal: AbortSignal) {
          const current = credential();
          if (current?.name !== token?.name || current?.value !== token?.value) {
            throw new Error('登录会话已变更');
          }
          const records = snapshot.encode(tasks);
          const next = decodeTodoSnapshot(records);
          await request('save', token, saveSignal, records);
          snapshot = next;
        },
      };
    },
  };
}
