import { AuthError, type SessionToken } from '@/domain/auth';
import type { PointsShopPort } from '@/domain/points-shop';
import { decodeBubbles, decodeItem, decodePage, decodePointsRecord, record } from './decode';

export function createPointsShopClient(
  baseUrl: string,
  credential: () => SessionToken | null,
  onUnauthorized: () => void,
): PointsShopPort {
  async function request(path: string, signal: AbortSignal, body?: object) {
    const token = credential();
    if (!token) throw new AuthError('unauthorized', '请先登录');
    const headers = new Headers({ [token.name]: token.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        credentials: 'include',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok) throw new Error(`商城服务暂不可用（HTTP ${response.status}）`);
      const data = record(await response.json());
      if (data.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (data.code !== 0)
        throw new Error(typeof data.message === 'string' ? data.message : '商城操作失败，请重试');
      return data.data;
    } catch (error) {
      if (!signal.aborted && error instanceof AuthError) onUnauthorized();
      if (error instanceof TypeError && !signal.aborted)
        throw new Error('连接商城失败，请检查网络后重试');
      throw error;
    }
  }
  return {
    bubbles: async (signal) => decodeBubbles(await request('chat/bubble/list', signal)),
    exchangeBubble: async (bubbleId, expectedPoints, signal) => {
      const items = decodeBubbles(
        await request('chat/bubble/exchange', signal, { bubbleId, expectedPoints }),
      );
      if (!items.some((item) => item.id === bubbleId && item.expiresAt !== null))
        throw new Error('服务器未确认气泡权益，请重新读取后再试');
      return items;
    },
    equipBubble: async (bubbleId, signal) =>
      decodeBubbles(await request('chat/bubble/equip', signal, { bubbleId })),
    items: async (page, signal) =>
      decodePage(await request(`props/list/page?current=${page}&pageSize=12`, signal), decodeItem),
    records: async (page, signal) =>
      decodePage(
        await request(`user/points/record/list/my?current=${page}&pageSize=12`, signal),
        decodePointsRecord,
      ),
    async purchase(id, signal) {
      if (!/^[1-9]\d*$/.test(id)) throw new Error('请选择有效的道具');
      if ((await request('props/purchase', signal, { propsId: id })) !== true)
        throw new Error('服务器未确认兑换成功，请核对积分记录后再试');
    },
  };
}
