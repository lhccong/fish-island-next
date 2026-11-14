import type { SessionToken } from '@/domain/auth';
import type { UndercoverPort } from '@/domain/undercover';
import { record, room, list, id, text } from './decode';
export function createUndercoverClient(
  base: string,
  token: () => SessionToken | null,
  expired: () => void,
): UndercoverPort {
  async function request(
    path: string,
    signal: AbortSignal,
    body?: object,
    post = false,
  ): Promise<unknown> {
    const credential = token();
    if (!credential) throw new Error('请先登录后进入联机房间');
    const headers = new Headers({ [credential.name]: credential.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/api/undercover/${path}`, {
        method: body || post ? 'POST' : 'GET',
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) {
        expired();
        throw new Error('登录已过期，请重新登录');
      }
      if (!response.ok) throw new Error(`卧底服务暂不可用（HTTP ${response.status}），请重试`);
      const payload = record(await response.json());
      if (payload.code === 40100) {
        expired();
        throw new Error('登录已过期，请重新登录');
      }
      if (payload.code !== 0) throw new Error(text(payload.message) || '操作失败，请重试');
      return payload.data;
    } catch (error) {
      if (!signal.aborted && error instanceof TypeError)
        throw new Error('连接卧底服务失败，请检查网络后重试');
      throw error;
    }
  }
  function confirmed(value: unknown) {
    if (value !== true) throw new Error('服务器未确认成功，请刷新查看房间状态');
  }
  return {
    async rooms(signal) {
      return list(await request('room/list', signal), room);
    },
    async room(roomId, signal) {
      const value = await request(`room/byId?roomId=${encodeURIComponent(roomId)}`, signal);
      return value == null ? null : room(value);
    },
    async create(settings, signal) {
      return id(await request('room/create', signal, settings));
    },
    async action(action, roomId, signal) {
      confirmed(
        await request(
          `room/${action}${['join', 'quit'].includes(action) ? '' : `?roomId=${encodeURIComponent(roomId)}`}`,
          signal,
          ['join', 'quit'].includes(action) ? { roomId } : undefined,
          true,
        ),
      );
    },
    async vote(roomId, targetId, signal) {
      confirmed(await request('room/vote', signal, { roomId, targetId }));
    },
    async guess(roomId, guessWord, signal) {
      const value = await request('room/guess', signal, { roomId, guessWord });
      if (typeof value !== 'boolean') throw new Error('猜词结果异常，请刷新');
      return value;
    },
  };
}
