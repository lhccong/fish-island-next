import type { SessionToken } from '@/domain/auth';
import type { DrawPort } from '@/domain/draw';
import { record, text, id, room, list, guess } from './decode';
export function createDrawClient(
  base: string,
  token: () => SessionToken | null,
  expired: () => void,
): DrawPort {
  async function request(
    path: string,
    signal: AbortSignal,
    body?: object,
    post = false,
  ): Promise<unknown> {
    const credential = token();
    if (!credential) throw new Error('请先登录后进入游戏');
    const headers = new Headers({ [credential.name]: credential.value });
    if (body) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${base.replace(/\/+$/, '')}/api/draw/${path}`, {
      method: post || body ? 'POST' : 'GET',
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
    if (!response.ok) throw new Error(`绘画服务暂不可用（HTTP ${response.status}），请重试`);
    const payload = record(await response.json());
    if (payload.code === 40100) {
      expired();
      throw new Error('登录已过期，请重新登录');
    }
    if (payload.code !== 0) throw new Error(text(payload.message) || '操作失败，请重试');
    return payload.data;
  }
  function confirmed(v: unknown) {
    if (v !== true) throw new Error('服务端未确认成功，请刷新重试');
  }
  return {
    rooms: async (signal) => list(await request('room/list', signal), room),
    room: async (roomId, signal) => {
      const v = await request(`room/${encodeURIComponent(roomId)}`, signal);
      return v == null ? null : room(v);
    },
    guesses: async (roomId, signal) =>
      list(await request(`room/${encodeURIComponent(roomId)}/guesses`, signal), guess),
    create: async (settings, signal) => id(await request('room/create', signal, settings)),
    action: async (action, roomId, signal) =>
      confirmed(
        await request(
          `${['start', 'end', 'next-round'].includes(action) ? 'game' : 'room'}/${action}?roomId=${encodeURIComponent(roomId)}`,
          signal,
          undefined,
          true,
        ),
      ),
    save: async (roomId, drawData, signal) =>
      confirmed(await request('data/save', signal, { roomId, drawData })),
    guess: async (roomId, guessWord, user, signal) => {
      const value = await request('guess', signal, {
        roomId,
        guessWord,
        messageWrapper: {
          message: {
            roomId,
            content: guessWord,
            sender: { id: user.id, name: user.name, avatar: user.avatarUrl },
            timestamp: new Date().toISOString(),
          },
        },
      });
      return value == null ? null : guess(value);
    },
  };
}
