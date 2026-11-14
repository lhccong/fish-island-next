import { AuthError, type SessionToken } from '@/domain/auth';
import type { SignInPort } from '@/domain/sign-in';
import { decodeMonth, decodeResult, record } from './decode';

export function createSignInClient(
  baseUrl: string,
  credential: () => SessionToken | null,
  onUnauthorized: () => void,
): SignInPort {
  async function request(path: string, signal: AbortSignal, body?: object) {
    const token = credential();
    if (!token) throw new AuthError('unauthorized', '请先登录');
    const headers = new Headers({ [token.name]: token.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}`, {
        method: body ? 'POST' : 'GET',
        credentials: 'include',
        headers,
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok) throw new Error(`签到服务暂不可用（HTTP ${response.status}）`);
      const value = record(await response.json());
      if (value.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (value.code !== 0)
        throw new Error(typeof value.message === 'string' ? value.message : '签到失败，请重试');
      return value.data;
    } catch (error) {
      if (!signal.aborted && error instanceof AuthError) onUnauthorized();
      if (signal.aborted || (error instanceof Error && error.name !== 'TypeError')) throw error;
      throw new Error('连接签到服务失败，请检查网络后重试');
    }
  }
  return {
    async month(year, month, signal) {
      const value = decodeMonth(await request(`sign/month?year=${year}&month=${month}`, signal));
      if (value.year !== year || value.month !== month) throw new Error('签到月份不匹配，请重试');
      return value;
    },
    async status(signal) {
      const value = record(await request('sign/status', signal));
      if (typeof value.todaySigned !== 'boolean') throw new Error('签到状态数据不完整');
      return value.todaySigned;
    },
    async sign(signal) {
      return decodeResult(await request('user/signIn', signal, {}));
    },
    async makeUp(signDate, signal) {
      return decodeResult(await request('sign/makeup', signal, { signDate }));
    },
  };
}
