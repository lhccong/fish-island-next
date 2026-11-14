import {
  LuckyBagCreateError,
  type LuckyBagDetail,
  type LuckyBagPort,
  type LuckyBagRecord,
} from '@/domain/chat';
import type { SessionToken } from '@/domain/auth';

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('福袋数据异常，请重试');
  return value as Record<string, unknown>;
}
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new Error('福袋数据异常，请重试');
  return value;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9_-]{1,128}$/i.test(value))
    throw new Error('福袋编号异常');
  return value;
}
function time(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const result = new Date(value).getTime();
  return Number.isFinite(result) ? result : null;
}
export function decodeLuckyBag(value: unknown): LuckyBagDetail {
  const data = object(value);
  const drawTime = time(data.drawTime ?? data.expireTime);
  if (
    (data.type !== 1 && data.type !== 2) ||
    ![0, 1, 2].includes(integer(data.status)) ||
    drawTime === null ||
    typeof data.joined !== 'boolean'
  )
    throw new Error('福袋数据异常，请重试');
  return {
    id: id(data.id),
    name: typeof data.name === 'string' ? data.name.slice(0, 500) : '福袋',
    creatorName: typeof data.creatorName === 'string' ? data.creatorName.slice(0, 200) : '岛友',
    totalAmount: integer(data.totalAmount),
    winnerCount: integer(data.winnerCount),
    participantCount: integer(data.participantCount),
    type: data.type,
    status: data.status as LuckyBagDetail['status'],
    joined: data.joined,
    drawTime,
  };
}
export function decodeLuckyBagRecords(value: unknown): readonly LuckyBagRecord[] {
  if (!Array.isArray(value)) throw new Error('福袋记录异常，请重试');
  const records = new Map<string, LuckyBagRecord>();
  for (const raw of value) {
    const data = object(raw);
    const key = id(data.id);
    records.set(key, {
      id: key,
      userName: typeof data.userName === 'string' ? data.userName.slice(0, 200) : '岛友',
      amount: integer(data.amount),
      winTime: time(data.winTime),
    });
  }
  return [...records.values()].sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
}
export function createLuckyBagClient(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): LuckyBagPort {
  async function request(action: string, signal: AbortSignal, bagId?: string, input?: unknown) {
    const creating = action === 'create';
    const reject = (message: string): never => {
      if (creating) throw new LuckyBagCreateError('rejected', message);
      throw new Error(message);
    };
    const credential = token();
    if (!credential) return reject('请登录后操作福袋');
    const query = bagId ? `?${new URLSearchParams({ luckyBagId: id(bagId) })}` : '';
    try {
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, '')}/api/luckybag/${action}${query}`,
        {
          method: creating || action === 'join' ? 'POST' : 'GET',
          credentials: 'include',
          cache: 'no-store',
          headers: {
            [credential.name]: credential.value,
            ...(creating ? { 'Content-Type': 'application/json' } : {}),
          },
          ...(creating ? { body: JSON.stringify(input) } : {}),
          signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        },
      );
      if (response.status === 401) {
        onExpired();
        return reject('登录已过期，请重新登录');
      }
      if (response.status >= 500) throw new Error('福袋服务暂时不可用，请重试');
      const payload = object(await response.json());
      if (payload.code === 40100) {
        onExpired();
        return reject('登录已过期，请重新登录');
      }
      if (payload.code !== 0) {
        if (
          typeof payload.code !== 'number' ||
          ![40000, 40101, 40300, 40400, 40600, 50001].includes(payload.code)
        )
          throw new Error('福袋响应异常');
        return reject(
          typeof payload.message === 'string'
            ? payload.message.slice(0, 300)
            : '福袋操作失败，请重试',
        );
      }
      if (!response.ok) throw new Error('福袋请求失败，请重试');
      return payload.data;
    } catch (error) {
      if (signal.aborted || error instanceof LuckyBagCreateError) throw error;
      if (creating)
        throw new LuckyBagCreateError(
          'uncertain',
          '福袋创建结果未确认，请勿重复提交。请查看进行中的福袋或核对积分记录。',
        );
      if (
        error instanceof TypeError ||
        error instanceof SyntaxError ||
        (error instanceof DOMException && error.name === 'TimeoutError')
      )
        throw new Error(
          action === 'join' ? '参与结果未确认，请刷新详情核对后重试' : '网络或响应异常，请重试',
        );
      throw error;
    }
  }
  return {
    async create(input, signal) {
      const raw = await request('create', signal, undefined, input);
      try {
        // Creation returns the stored entity before the per-user joined field is added.
        return decodeLuckyBag({ ...object(raw), joined: false });
      } catch {
        throw new LuckyBagCreateError(
          'uncertain',
          '福袋创建结果未确认，请勿重复提交。请查看进行中的福袋或核对积分记录。',
        );
      }
    },
    async detail(bagId, signal) {
      return decodeLuckyBag(await request('detail', signal, bagId));
    },
    async active(signal) {
      const raw = await request('active', signal);
      if (!Array.isArray(raw)) throw new Error('福袋列表异常，请重试');
      return [
        ...new Map(
          raw.map((item) => {
            const bag = decodeLuckyBag(item);
            return [bag.id, bag] as const;
          }),
        ).values(),
      ];
    },
    async join(bagId, signal) {
      if ((await request('join', signal, bagId)) !== true)
        throw new Error('参与未确认，请刷新详情核对后重试');
    },
    async records(bagId, signal) {
      return decodeLuckyBagRecords(await request('records', signal, bagId));
    },
  };
}
