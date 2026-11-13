import type { RedPacketDetail, RedPacketPort, RedPacketRecord } from '@/domain/chat';
import { RedPacketCreateError } from '@/domain/chat';
import type { SessionToken } from '@/domain/auth';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('红包数据格式异常，请重试');
  return value as Record<string, unknown>;
}
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('红包数据格式异常，请重试');
  return value;
}
export function decodeRedPacket(value: unknown): RedPacketDetail {
  const data = object(value);
  if (![1, 2, 3].includes(Number(data.type)) || ![0, 1, 2].includes(Number(data.status)))
    throw new Error('红包数据格式异常，请重试');
  return {
    name: typeof data.name === 'string' ? data.name.slice(0, 500) : '积分红包',
    type: integer(data.type) as RedPacketDetail['type'],
    status: integer(data.status) as RedPacketDetail['status'],
    remainingCount: integer(data.remainingCount),
  };
}
export function decodeRedPacketRecords(value: unknown): readonly RedPacketRecord[] {
  if (!Array.isArray(value)) throw new Error('红包记录格式异常，请重试');
  const records = new Map<string, RedPacketRecord>();
  for (const raw of value) {
    const item = object(raw);
    if (typeof item.id !== 'string' || !item.id) throw new Error('红包记录格式异常，请重试');
    records.set(item.id, {
      id: item.id,
      userName: typeof item.userName === 'string' ? item.userName : '岛友',
      amount: integer(item.amount),
      grabTime:
        typeof item.grabTime === 'string' && Number.isFinite(Date.parse(item.grabTime))
          ? item.grabTime
          : null,
    });
  }
  return [...records.values()].sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
}

export function createRedPacketClient(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): RedPacketPort {
  async function request(action: string, id: string, signal: AbortSignal, answer = '') {
    const credential = token();
    if (!credential) throw new Error('请登录后操作红包');
    const query = new URLSearchParams({ redPacketId: id });
    if (answer) query.set('answer', answer);
    try {
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, '')}/api/redpacket/${action}?${query}`,
        {
          method: action === 'grab' ? 'POST' : 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: { [credential.name]: credential.value },
          signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        },
      );
      if (response.status === 401) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      if (!response.ok) throw new Error('红包请求失败，请稍后重试');
      const payload = object(await response.json());
      if (payload.code === 40100) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      if (payload.code !== 0)
        throw new Error(
          typeof payload.message === 'string'
            ? payload.message.slice(0, 300)
            : '红包操作失败，请稍后重试',
        );
      return payload.data;
    } catch (error) {
      if (signal.aborted) throw error;
      if (
        error instanceof TypeError ||
        (error instanceof DOMException && error.name === 'TimeoutError')
      )
        throw new Error(
          action === 'grab' ? '领取结果未确认，请先查看记录再重试' : '网络异常，请重试',
        );
      if (error instanceof SyntaxError) throw new Error('红包响应异常，请重试');
      throw error;
    }
  }
  return {
    async create(input, signal) {
      const credential = token();
      if (!credential) throw new RedPacketCreateError('rejected', '请登录后发送红包');
      try {
        const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/redpacket/create`, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', [credential.name]: credential.value },
          body: JSON.stringify({
            totalAmount: input.totalAmount,
            count: input.count,
            type: input.type,
            name: input.name,
            ...(input.type === 3 ? { answer: input.answer } : {}),
          }),
          signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        });
        if (response.status === 401) {
          onExpired();
          throw new RedPacketCreateError('rejected', '登录已过期，请重新登录');
        }
        if (response.status >= 500) throw new Error('Unknown creation outcome');
        const payload = object(await response.json());
        if (payload.code === 40100) {
          onExpired();
          throw new RedPacketCreateError('rejected', '登录已过期，请重新登录');
        }
        if (
          typeof payload.code !== 'number' ||
          (payload.code !== 0 && ![40000, 40101, 40300, 40400, 40600, 50001].includes(payload.code))
        )
          throw new Error('Unknown creation outcome');
        if (payload.code !== 0)
          throw new RedPacketCreateError(
            'rejected',
            typeof payload.message === 'string'
              ? payload.message.slice(0, 300)
              : '红包创建失败，请重试',
          );
        if (
          !response.ok ||
          typeof payload.data !== 'string' ||
          !/^[a-z0-9_-]{1,128}$/i.test(payload.data)
        )
          throw new Error('Unknown creation outcome');
        return payload.data;
      } catch (error) {
        if (signal.aborted || error instanceof RedPacketCreateError) throw error;
        throw new RedPacketCreateError(
          'uncertain',
          '红包创建结果未确认，请勿重复提交。请核对积分记录或联系管理员确认。',
        );
      }
    },
    async detail(id, signal) {
      return decodeRedPacket(await request('detail', id, signal));
    },
    async grab(id, answer, signal) {
      return integer(await request('grab', id, signal, answer));
    },
    async records(id, signal) {
      return decodeRedPacketRecords(await request('records', id, signal));
    },
  };
}
