import type { AboutPort } from '@/domain/about';
import type { SessionToken } from '@/domain/auth';
import { record, text, decodeDonations, decodeOrder } from './decode';

export function createAboutClient(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): AboutPort {
  async function request(path: string, signal: AbortSignal, body?: object): Promise<unknown> {
    const credential = token();
    const headers = new Headers();
    if (credential) headers.set(credential.name, credential.value);
    if (body) headers.set('Content-Type', 'application/json');
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
        credentials: 'include',
        cache: 'no-store',
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new Error('网络连接失败，请稍后重试');
    }
    if (response.status === 401) {
      onExpired();
      throw new Error('请登录后再进行此操作');
    }
    if (!response.ok) throw new Error(`服务暂不可用（HTTP ${response.status}），请稍后重试`);
    const payload = record(await response.json());
    if (payload.code === 40100) {
      onExpired();
      throw new Error('请登录后再进行此操作');
    }
    if (payload.code !== 0) throw new Error(text(payload.message) || '操作失败，请稍后重试');
    return payload.data;
  }
  return {
    donations: async (page, details, signal) =>
      decodeDonations(
        await request(details ? 'donation/detail/list/page/vo' : 'donation/list/page/vo', signal, {
          current: page,
          pageSize: details ? 10 : 20,
          ...(!details ? { sortField: 'amount', sortOrder: 'descend' } : {}),
        }),
      ),
    createOrder: async (amount, remark, returnUrl, signal) =>
      decodeOrder(
        await request('pay/create', signal, {
          totalFee: amount,
          type: 1,
          remark: remark || undefined,
          returnUrl,
        }),
      ),
    order: async (id, signal) =>
      decodeOrder(await request(`pay/query?tradeOrderId=${encodeURIComponent(id)}`, signal)),
  };
}
