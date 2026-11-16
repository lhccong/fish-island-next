import type { SessionToken } from '@/domain/auth';
import type { ChatReportPort, ChatReportReason } from '@/domain/chat';

export function createChatReport(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): ChatReportPort {
  async function request(path: string, signal: AbortSignal, body?: unknown): Promise<unknown> {
    const credential = token();
    if (!credential) throw new Error('请登录后举报');
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/report/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', [credential.name]: credential.value },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (response.status === 401) {
      onExpired();
      throw new Error('登录已过期，请重新登录');
    }
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !('code' in payload))
      throw new Error('举报数据格式异常，请重试');
    if (payload.code === 40100) {
      onExpired();
      throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok || payload.code !== 0)
      throw new Error(
        'message' in payload && typeof payload.message === 'string'
          ? payload.message.slice(0, 200)
          : '举报请求失败，请重试',
      );
    return 'data' in payload ? payload.data : undefined;
  }
  return {
    async reasons(signal) {
      const data = await request('reasons', signal);
      if (!Array.isArray(data)) throw new Error('举报原因格式异常，请重试');
      const reasons: ChatReportReason[] = [];
      for (const item of data) {
        if (
          !item ||
          typeof item !== 'object' ||
          !Number.isSafeInteger(item.value) ||
          typeof item.text !== 'string' ||
          !item.text.trim()
        )
          throw new Error('举报原因格式异常，请重试');
        if (!reasons.some((reason) => reason.value === item.value))
          reasons.push({ value: item.value as number, text: item.text.trim() });
      }
      return reasons;
    },
    async submit(input, signal) {
      const id = await request('add', signal, { ...input, reportType: 1 });
      if (
        (typeof id !== 'string' || !id.trim()) &&
        (typeof id !== 'number' || !Number.isFinite(id))
      )
        throw new Error('未收到举报确认，请稍后重试');
    },
  };
}
