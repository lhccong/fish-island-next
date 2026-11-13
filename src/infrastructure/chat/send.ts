import type { ChatSendPort } from '@/domain/chat';
import type { SessionToken } from '@/domain/auth';
import { decodeReceivedMessage } from './protocol';

export function createChatSender(
  baseUrl: string,
  token: () => SessionToken | null,
  onExpired: () => void,
): ChatSendPort {
  return {
    async send(input, signal) {
      const credential = token();
      if (!credential) throw new Error('请登录后发送消息');
      const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/chat/message/send`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', [credential.name]: credential.value },
        body: JSON.stringify(input),
        signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      });
      if (response.status === 401) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== 'object' || !('code' in payload))
        throw new Error('发送结果异常，请重试确认');
      if (payload.code === 40100) {
        onExpired();
        throw new Error('登录已过期，请重新登录');
      }
      if (!response.ok || payload.code !== 0) {
        throw new Error(
          'message' in payload && typeof payload.message === 'string'
            ? payload.message.slice(0, 200)
            : '发送失败，请重试',
        );
      }
      const data = 'data' in payload ? payload.data : null;
      const message = decodeReceivedMessage(
        data && typeof data === 'object' && 'message' in data ? data.message : null,
      );
      if (!message || message.clientMessageId !== input.clientMessageId)
        throw new Error('发送结果异常，请重试确认');
      return message;
    },
  };
}
