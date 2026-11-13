import { chatImageUrl, type ChatEmoticon, type ChatEmoticonPort } from '@/domain/chat';
import type { SessionToken } from '@/domain/auth';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object') throw new Error('表情包数据异常，请重试');
  return value as Record<string, unknown>;
}
export function createChatEmoticons(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): ChatEmoticonPort {
  async function request(path: string, body: unknown, signal: AbortSignal) {
    const credential = token();
    if (!credential) throw new Error('请登录后使用表情包');
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/emoticon_favour/${path}`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', [credential.name]: credential.value },
      // 旧后端 @RequestBody String 使用原始 URL，不能加 JSON 字符串引号。
      body: typeof body === 'string' ? body : JSON.stringify(body),
      signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
    });
    if (response.status === 401) {
      onExpired();
      throw new Error('登录已过期，请重新登录');
    }
    const payload = record(await response.json());
    if (payload.code === 40100) {
      onExpired();
      throw new Error('登录已过期，请重新登录');
    }
    if (!response.ok || payload.code !== 0)
      throw new Error(
        typeof payload.message === 'string'
          ? payload.message.slice(0, 200)
          : '表情包操作失败，请重试',
      );
    return payload.data;
  }
  return {
    async list(page, signal) {
      const data = record(await request('list/page', { current: page, pageSize: 24 }, signal));
      // 后端 JsonConfig 将 Long（包括分页 total）序列化为十进制字符串。
      const total =
        typeof data.total === 'number'
          ? data.total
          : typeof data.total === 'string' && /^\d+$/.test(data.total)
            ? Number(data.total)
            : NaN;
      if (!Array.isArray(data.records) || !Number.isSafeInteger(total) || total < 0)
        throw new Error('收藏列表异常，请重试');
      const items = data.records.map((value): ChatEmoticon => {
        const item = record(value);
        const url = chatImageUrl(item.emoticonSrc);
        if (!url || !['string', 'number'].includes(typeof item.id) || !String(item.id))
          throw new Error('收藏图片数据异常，请重试');
        return { id: String(item.id), url };
      });
      return { items, total };
    },
    async add(value, signal) {
      const url = chatImageUrl(value);
      if (!url) throw new Error('图片地址无效');
      if ((await request('add', url, signal)) !== true) throw new Error('添加失败，请重试');
    },
    async remove(id, signal) {
      if ((await request('delete', { id }, signal)) !== true) throw new Error('移除失败，请重试');
    },
    async search(keyword, page, signal) {
      const word = keyword.endsWith('表情') ? keyword : `${keyword}表情`;
      const count = 30;
      const params = new URLSearchParams({
        tn: 'resultjson_com',
        word,
        queryWord: word,
        ie: 'utf-8',
        oe: 'utf-8',
        pn: String((page - 1) * count),
        rn: String(count),
      });
      const response = await fetch(`/emoticon-search?${params}`, {
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      });
      let payload: Record<string, unknown>;
      try {
        payload = record(await response.json());
      } catch {
        throw new Error('百度搜索暂不可用，请重试或使用我的收藏');
      }
      if (!response.ok || !Array.isArray(payload.data))
        throw new Error('百度搜索暂不可用，请重试或使用我的收藏');
      const items = new Map<string, ChatEmoticon>();
      for (const value of payload.data) {
        if (!value || typeof value !== 'object') continue;
        const item = record(value);
        const thumb = chatImageUrl(item.thumbURL);
        const url = thumb && (chatImageUrl(item.middleURL) ?? thumb);
        if (url) items.set(url, { id: url, url });
      }
      return {
        items: [...items.values()],
        total: items.size >= count ? page * count + 1 : (page - 1) * count + items.size,
      };
    },
  };
}
