import type { OnlineMember, OnlineMembersPort } from '@/domain/chat';
import type { SessionToken } from '@/domain/auth';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('在线成员数据格式异常，请重试');
  return value as Record<string, unknown>;
}

export function decodeOnlineMembers(value: unknown): readonly OnlineMember[] {
  if (!Array.isArray(value)) throw new Error('在线成员数据格式异常，请重试');
  const members = new Map<string, OnlineMember>();
  for (const item of value) {
    const data = record(item);
    if (
      (typeof data.id !== 'string' && typeof data.id !== 'number') ||
      !String(data.id) ||
      (typeof data.id === 'number' && !Number.isSafeInteger(data.id))
    )
      throw new Error('在线成员数据格式异常，请重试');
    let avatar: string | null = null;
    if (typeof data.avatar === 'string') {
      try {
        const url = new URL(data.avatar);
        if (url.protocol === 'https:' || url.protocol === 'http:') avatar = url.href;
      } catch {
        /* 非有效图片地址时使用姓名占位。 */
      }
    }
    members.set(String(data.id), {
      id: String(data.id),
      name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : '未命名岛友',
      avatar,
    });
  }
  return [...members.values()];
}

export function createChatClient(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): OnlineMembersPort {
  return {
    async loadOnlineMembers(signal) {
      const credential = token();
      if (!credential) throw new Error('请先登录后查看在线成员');
      try {
        const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/chat/online/user`, {
          headers: { [credential.name]: credential.value },
          credentials: 'include',
          cache: 'no-store',
          signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        });
        if (response.status === 401) {
          onExpired();
          throw new Error('登录已过期，请重新登录');
        }
        if (!response.ok) throw new Error('在线成员加载失败，请稍后重试');
        const payload = record(await response.json());
        if (payload.code === 40100) {
          onExpired();
          throw new Error('登录已过期，请重新登录');
        }
        if (payload.code !== 0) throw new Error('在线成员加载失败，请稍后重试');
        return decodeOnlineMembers(payload.data);
      } catch (error) {
        if (signal.aborted) throw error;
        if (error instanceof SyntaxError) throw new Error('在线成员数据格式异常，请重试');
        if (error instanceof DOMException && error.name === 'TimeoutError')
          throw new Error('获取在线成员超时，请重试');
        if (error instanceof TypeError) throw new Error('无法获取在线成员，请检查网络后重试');
        throw error;
      }
    },
  };
}
