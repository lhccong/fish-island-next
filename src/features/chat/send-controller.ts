import type { AuthUser } from '@/domain/auth';
import type { ChatSendPort, SendMessageInput } from '@/domain/chat';
import type { createMessageStore } from './message-store';

export function createSendController(
  port: ChatSendPort | undefined,
  model: ReturnType<typeof createMessageStore>,
) {
  const requests = new Map<string, AbortController>();
  const inputs = new Map<string, SendMessageInput>();
  let generation = 0;
  const update = (key: string, delivery: 'sending' | 'sent' | 'failed', sendError?: string) => {
    model.updateDelivery(key, delivery, sendError);
  };
  const run = async (key: string, input: SendMessageInput) => {
    if (!port || requests.has(key)) return;
    const abort = new AbortController();
    requests.set(key, abort);
    update(key, 'sending');
    const scope = generation;
    try {
      const message = await port.send(input, abort.signal);
      if (scope !== generation || abort.signal.aborted) return;
      if (message.senderId !== model.store.getState().messages[key]?.senderId)
        throw new Error('发送结果账号不匹配');
      model.apply([{ type: 'message', message }]);
      update(key, 'sent');
      inputs.delete(key);
    } catch (error) {
      if (scope !== generation || abort.signal.aborted) return;
      const confirmed = model.store.getState().messages[key]?.id !== key;
      update(
        key,
        confirmed ? 'sent' : 'failed',
        confirmed
          ? undefined
          : error instanceof Error &&
              !(error instanceof TypeError) &&
              !(error instanceof DOMException)
            ? error.message
            : '发送未确认，请检查网络后重试',
      );
      if (confirmed) inputs.delete(key);
    } finally {
      if (scope === generation) requests.delete(key);
    }
  };
  const enqueue = (
    content: string,
    quotedMessageId: string | undefined,
    user: AuthUser,
  ): string | null => {
    if (!port || !user.id || !content.trim() || content.length > 5000) return null;
    for (const key of inputs.keys()) {
      if (!requests.has(key) && model.store.getState().messages[key]?.delivery === 'sent')
        inputs.delete(key);
    }
    if (inputs.size >= 50) return null;
    const clientMessageId = crypto.randomUUID();
    const key = `local:${clientMessageId}`;
    const input = { content, quotedMessageId, clientMessageId };
    inputs.set(key, input);
    const original = Object.values(model.store.getState().messages).find(
      (m) => m.id === quotedMessageId,
    );
    model.apply([
      {
        type: 'message',
        message: {
          id: key,
          clientMessageId,
          senderId: user.id,
          senderName: user.name,
          senderAvatar: user.avatarUrl,
          content,
          createdAt: Date.now(),
          revoked: false,
          delivery: 'sending',
          ...(original
            ? {
                quote: {
                  id: original.id,
                  senderName: original.senderName,
                  content: original.content,
                },
              }
            : {}),
        },
      },
    ]);
    void run(key, input);
    return key;
  };
  return {
    enqueue,
    repeat(content: string, user: AuthUser) {
      if (
        [...inputs.keys()].some(
          (key) =>
            inputs.get(key)?.content === content &&
            model.store.getState().messages[key]?.delivery === 'sending',
        )
      )
        return false;
      return enqueue(content, undefined, user) !== null;
    },
    send(content: string, quotedMessageId: string | undefined, user: AuthUser) {
      return enqueue(content, quotedMessageId, user) !== null;
    },
    retry(key: string) {
      const input = inputs.get(key);
      if (input) void run(key, input);
    },
    reset() {
      generation++;
      requests.forEach((request) => request.abort());
      requests.clear();
      inputs.clear();
    },
  };
}
