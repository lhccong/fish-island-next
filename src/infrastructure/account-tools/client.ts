import { AuthError, type SessionToken } from '@/domain/auth';
import type { AccountToolsPort, DeveloperApp } from '@/domain/account-tools';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('服务器返回的数据格式不正确');
  return value as Record<string, unknown>;
}
function text(value: unknown): string { return typeof value === 'string' ? value : ''; }
export function createAccountToolsClient(base: string, credential: () => SessionToken | null, expired: () => void): AccountToolsPort {
  async function request(path: string, signal: AbortSignal, method = 'GET', body?: object) {
    const token = credential();
    if (!token) throw new AuthError('unauthorized', '请先登录');
    const headers = new Headers({ [token.name]: token.value });
    if (body) headers.set('Content-Type', 'application/json');
    try {
      const response = await fetch(`${base.replace(/\/+$/, '')}/api/${path}`, { method, headers, credentials: 'include', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]), ...(body ? {body: JSON.stringify(body)} : {}) });
      if (response.status === 401) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (!response.ok) throw new Error(`服务暂不可用（HTTP ${response.status}）`);
      const result = record(await response.json());
      if (result.code === 40100) throw new AuthError('unauthorized', '登录已过期，请重新登录');
      if (result.code !== 0) throw new Error(text(result.message) || '操作失败，请稍后重试');
      return result.data;
    } catch (error) {
      if (!signal.aborted && error instanceof AuthError) expired();
      if (error instanceof TypeError) throw new Error('连接失败，请检查网络后重试');
      throw error;
    }
  }
  return {
    async sendCode(email, signal) { await request('user/email/send', signal, 'POST', { email }); },
    async resetPassword(values, signal) { await request('user/email/resetPassword', signal, 'POST', values); },
    async redeem(code, signal) { const value = await request('redeemCode/use', signal, 'POST', { code }); return text(record(value).message) || '兑换成功，奖励已发放到账户'; },
    async apps(signal) {
      const value = await request('auth/app/list/my', signal);
      if (!Array.isArray(value)) throw new Error('应用列表格式不正确');
      return value.map((item): DeveloperApp => {
        const v = record(item);
        if ((typeof v.id !== 'number' && typeof v.id !== 'string') || !text(v.appName)) throw new Error('应用资料不完整');
        return { id: String(v.id), appName: text(v.appName), appDesc: text(v.appDesc), appWebsite: text(v.appWebsite), redirectUri: text(v.redirectUri), clientId: text(v.clientId), status: v.status === 1 ? 1 : 0 };
      });
    },
    async saveApp(values, id, signal) { await request(`auth/app/${id ? 'update' : 'create'}`, signal, 'POST', { ...values, ...(id ? {id} : {}) }); },
    async deleteApp(id, signal) { await request('auth/app/delete', signal, 'POST', {id}); },
    async secret(id, reset, signal) {
      const value = await request(`auth/app/${reset ? 'reset-secret' : 'detail'}?id=${encodeURIComponent(id)}`, signal, reset ? 'POST' : 'GET');
      const secret = reset ? text(value) : text(record(value).clientSecret);
      if (!secret) throw new Error('未取得应用密钥，请重试');
      return secret;
    },
  };
}
