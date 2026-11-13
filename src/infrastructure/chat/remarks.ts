import type { SessionToken } from '@/domain/auth';
import type { ChatRemarksPort, UserRemarks } from '@/domain/chat';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('备注数据格式异常，请重试');
  return value as Record<string, unknown>;
}
export function decodeRemarks(value: unknown): UserRemarks {
  if (value === null) return {};
  const content = record(value).content;
  if (typeof content !== 'string') throw new Error('备注数据格式异常，请重试');
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('备注数据格式异常，请重试');
  }
  const entries = Object.entries(record(parsed));
  if (entries.some(([id, name]) => !id || typeof name !== 'string'))
    throw new Error('备注数据格式异常，请重试');
  return Object.fromEntries(entries) as UserRemarks;
}
export function createChatRemarks(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): ChatRemarksPort {
  async function request(signal: AbortSignal, remarks?: UserRemarks) {
    const credential = token();
    if (!credential) throw new Error('请登录后使用备注');
    const response = await fetch(
      `${baseUrl.replace(/\/+$/, '')}/api/userRemark/${remarks ? 'save' : 'get'}`,
      {
        method: remarks ? 'POST' : 'GET',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', [credential.name]: credential.value },
        ...(remarks ? { body: JSON.stringify({ content: JSON.stringify(remarks) }) } : {}),
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      },
    );
    if (response.status === 401) {
      onExpired();
      throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok) throw new Error('备注请求失败，请检查网络后重试');
    const payload = record(await response.json());
    if (payload.code === 40100) {
      onExpired();
      throw new Error('登录已过期，请重新登录');
    }
    if (payload.code !== 0) throw new Error('备注操作失败，请重试');
    return payload.data;
  }
  return {
    load: async (signal) => decodeRemarks(await request(signal)),
    async save(remarks, signal) {
      if ((await request(signal, remarks)) !== true) throw new Error('备注保存失败，请重试');
    },
  };
}
