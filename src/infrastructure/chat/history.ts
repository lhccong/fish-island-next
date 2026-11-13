import type { ChatHistoryPort, MessagePage } from '@/domain/chat';
import type { SessionToken } from '@/domain/auth';
import { decodeReceivedMessage } from './protocol';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('历史消息数据格式异常，请重试');
  return value as Record<string, unknown>;
}
export function decodeHistory(value: unknown, limit: number): MessagePage {
  const records = record(value).records;
  if (!Array.isArray(records) || records.length > limit)
    throw new Error('历史消息数据格式异常，请重试');
  const messages = records.map((item: unknown) => {
    const message = decodeReceivedMessage(record(record(item).messageWrapper).message);
    if (!message) throw new Error('历史消息数据格式异常，请重试');
    return message;
  });
  return { messages, nextCursor: records.length === limit ? (messages.at(-1)?.id ?? null) : null };
}

export function createChatHistory(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): ChatHistoryPort {
  return {
    async loadHistory({ conversationId, cursor, limit, signal }) {
      if (conversationId !== 'public') throw new Error('暂不支持该会话历史');
      const credential = token();
      if (!credential) throw new Error('请登录后加载历史消息');
      try {
        const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/chat/message/page/vo`, {
          method: 'POST',
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json', [credential.name]: credential.value },
          body: JSON.stringify({
            roomId: -1,
            pageSize: limit,
            sortField: 'createTime',
            sortOrder: 'desc',
            ...(cursor === null ? { current: 1 } : { messageId: cursor }),
          }),
          signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(15000)]),
        });
        if (response.status === 401) {
          onExpired();
          throw new Error('登录已过期，请重新登录');
        }
        if (!response.ok) throw new Error('历史消息加载失败，请重试');
        const payload = record(await response.json());
        if (payload.code === 40100) {
          onExpired();
          throw new Error('登录已过期，请重新登录');
        }
        if (payload.code !== 0) throw new Error('历史消息加载失败，请重试');
        return decodeHistory(payload.data, limit);
      } catch (error) {
        if (signal?.aborted) throw error;
        if (error instanceof TypeError) throw new Error('无法加载历史消息，请检查网络后重试');
        if (error instanceof DOMException && error.name === 'TimeoutError')
          throw new Error('历史消息加载超时，请重试');
        if (error instanceof SyntaxError) throw new Error('历史消息数据格式异常，请重试');
        throw error;
      }
    },
  };
}
