import { AuthError, type SessionToken } from '@/domain/auth';
import type { SsoPort } from '@/domain/sso';

export function createSsoClient(baseUrl: string, readToken: () => SessionToken | null): SsoPort {
  async function get(path: string, params: URLSearchParams, signal: AbortSignal): Promise<unknown> {
    const headers = new Headers();
    const token = readToken();
    if (token) headers.set(token.name, token.value);
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}?${params}`, {
        headers,
        credentials: 'include',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok) throw new Error(`授权服务暂不可用（HTTP ${response.status}）`);
      const payload: unknown = await response.json();
      if (typeof payload === 'string') return payload;
      if (!payload || typeof payload !== 'object') throw new Error('授权服务返回的数据格式异常');
      const record = payload as Record<string, unknown>;
      if (record.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (record.code !== 0)
        throw new Error(typeof record.message === 'string' ? record.message : '授权请求失败');
      return record.data;
    } catch (error) {
      if (signal.aborted || error instanceof AuthError) throw error;
      if (error instanceof TypeError) throw new Error('连接授权服务失败，请检查网络后重试');
      throw error;
    }
  }
  return {
    async application(clientId, signal) {
      const data = await get('auth/app/info', new URLSearchParams({ clientId }), signal);
      if (data == null) return null;
      if (typeof data !== 'object' || Array.isArray(data)) throw new Error('应用信息格式异常');
      const app = data as Record<string, unknown>;
      return {
        name: typeof app.appName === 'string' ? app.appName : '',
        website: typeof app.appWebsite === 'string' ? app.appWebsite : '',
        description: typeof app.appDesc === 'string' ? app.appDesc : '',
      };
    },
    async authorize(request, signal) {
      const params = new URLSearchParams({
        client_id: request.clientId,
        redirect_uri: request.redirectUri,
        response_type: request.responseType,
        scope: request.scope,
      });
      if (request.state) params.set('state', request.state);
      const data = await get('oauth2/authorize', params, signal);
      if (typeof data === 'string') {
        try {
          const url = new URL(data);
          if (['https:', 'http:'].includes(url.protocol)) return url.href;
        } catch {
          /* handled below */
        }
      }
      throw new Error('授权失败，未获取到重定向地址');
    },
  };
}
