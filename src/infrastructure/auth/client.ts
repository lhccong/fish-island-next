import { AuthError, type AuthPort, type SessionToken } from '@/domain/auth';
import { asRecord, decodeToken, decodeUser, unwrap } from './decode';

export function createAuthClient(baseUrl: string): AuthPort {
  const base = baseUrl.replace(/\/+$/, '');
  async function request(
    path: string,
    method: 'GET' | 'POST',
    signal: AbortSignal,
    token?: SessionToken,
    body?: object,
  ): Promise<unknown> {
    const headers = new Headers();
    if (body) headers.set('Content-Type', 'application/json');
    if (token) headers.set(token.name, token.value);
    try {
      const response = await fetch(`${base}/api/user${path}`, {
        method,
        credentials: 'include',
        headers,
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok)
        throw new AuthError('network', `登录服务暂不可用（HTTP ${response.status}）`);
      const payload: unknown = await response.json();
      return unwrap(payload);
    } catch (error) {
      if (signal.aborted || error instanceof AuthError) throw error;
      if (error instanceof SyntaxError)
        throw new AuthError('invalid-response', '登录服务返回的数据格式异常');
      throw new AuthError('network', '连接登录服务失败，请检查网络后重试');
    }
  }
  return {
    async login({ account, password }, signal) {
      const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account);
      const payload = asRecord(
        await request(
          email ? '/email/login' : '/login',
          'POST',
          signal,
          undefined,
          email
            ? { email: account, userPassword: password }
            : { userAccount: account, userPassword: password },
        ),
      );
      return { user: decodeUser(payload), token: decodeToken(payload.saTokenInfo) };
    },
    async current(token, signal) {
      return decodeUser(await request('/get/login', 'GET', signal, token));
    },
    async logout(token, signal) {
      if ((await request('/logout', 'POST', signal, token)) !== true)
        throw new AuthError('rejected', '服务器未确认退出');
    },
  };
}
