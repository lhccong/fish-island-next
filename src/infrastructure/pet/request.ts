import type { SessionToken } from '@/domain/auth';
import { record, text } from './decode';

export function createPetRequest(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
) {
  return async function request(
    path: string,
    signal: AbortSignal,
    body?: object,
    post = false,
  ): Promise<unknown> {
    const credential = token();
    if (!credential) throw new Error('请先登录后再进入伙伴营地');
    const headers = new Headers({ [credential.name]: credential.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}`, {
        method: body || post ? 'POST' : 'GET',
        headers,
        credentials: 'include',
        cache: 'no-store',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      if (!response.ok) throw new Error(`伙伴服务暂不可用（HTTP ${response.status}），请稍后重试`);
      const payload = record(await response.json());
      if (payload.code === 40100) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      if (payload.code !== 0) throw new Error(text(payload.message) || '操作失败，请稍后重试');
      return payload.data;
    } catch (error) {
      if (signal.aborted) throw error;
      if (error instanceof TypeError) throw new Error('连接伙伴服务失败，请检查网络后重试');
      throw error;
    }
  };
}
