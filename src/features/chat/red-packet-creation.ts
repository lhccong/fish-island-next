import { createStore } from 'zustand/vanilla';
import type { AuthUser } from '@/domain/auth';
import {
  RedPacketCreateError,
  validateRedPacketForm,
  type RedPacketFormValues,
  type RedPacketPort,
} from '@/domain/chat';
import type { ChatRealtimeController } from './realtime-controller';

type Phase = 'editing' | 'creating' | 'publish-error' | 'publishing' | 'success' | 'uncertain';
interface CreationState {
  values: RedPacketFormValues;
  phase: Phase;
  error: string;
  packetId: string | null;
  messageKey: string | null;
}
const defaults = (): RedPacketFormValues => ({
  type: 1,
  totalAmount: '100',
  count: '10',
  name: '恭喜发财，大吉大利！',
  answer: '',
});
export function createRedPacketCreation(
  port: RedPacketPort,
  accountId: string,
  chat: ChatRealtimeController,
) {
  const store = createStore<CreationState>(() => ({
    values: defaults(),
    phase: 'editing',
    error: '',
    packetId: null,
    messageKey: null,
  }));
  let request: AbortController | null = null;
  let unsubscribe: (() => void) | undefined;
  let generation = 0;
  let owner: AuthUser | null = null;
  const observe = () => {
    const state = store.getState();
    if (!state.messageKey || !['publishing', 'publish-error'].includes(state.phase)) return;
    const message = chat.store.getState().messages[state.messageKey];
    if (message?.delivery === 'sent') store.setState({ phase: 'success', error: '' });
    else if (message?.delivery === 'sending' && state.phase === 'publish-error')
      store.setState({ phase: 'publishing', error: '' });
    else if (message?.delivery === 'failed')
      store.setState({
        phase: 'publish-error',
        error: '红包已创建，消息发布失败。请重试发布，不会再次扣积分。',
      });
  };
  const publish = () => {
    const state = store.getState();
    if (!state.packetId || !owner || !['creating', 'publish-error'].includes(state.phase)) return;
    if (state.messageKey) {
      store.setState({ phase: 'publishing', error: '' });
      chat.sender.retry(state.messageKey);
    } else {
      const key = chat.sender.enqueue(`[redpacket]${state.packetId}[/redpacket]`, undefined, owner);
      store.setState(
        key
          ? { messageKey: key, phase: 'publishing', error: '' }
          : {
              phase: 'publish-error',
              error: '红包已创建，待处理消息过多。请处理失败消息后重试发布，不会再次扣积分。',
            },
      );
    }
    observe();
  };
  return {
    store,
    start() {
      unsubscribe ??= chat.store.subscribe(observe);
      observe();
    },
    setValues(patch: Partial<RedPacketFormValues>) {
      if (store.getState().phase !== 'editing') return;
      store.setState((state) => ({ values: { ...state.values, ...patch }, error: '' }));
    },
    async submit(user: AuthUser | undefined) {
      if (!user || user.id !== accountId || request || store.getState().phase !== 'editing') return;
      let input;
      try {
        input = validateRedPacketForm(store.getState().values);
      } catch (error) {
        store.setState({ error: error instanceof Error ? error.message : '请检查红包内容' });
        return;
      }
      owner = user;
      request = new AbortController();
      const current = request;
      const scope = generation;
      store.setState({ phase: 'creating', error: '' });
      try {
        const packetId = await port.create(input, current.signal);
        if (current.signal.aborted || generation !== scope) return;
        store.setState((state) => ({ packetId, values: { ...state.values, answer: '' } }));
        publish();
      } catch (error) {
        if (!current.signal.aborted && generation === scope)
          store.setState({
            phase:
              error instanceof RedPacketCreateError && error.kind === 'rejected'
                ? 'editing'
                : 'uncertain',
            error: error instanceof Error ? error.message : '创建结果未确认，请勿重复提交',
          });
      } finally {
        if (request === current) request = null;
      }
    },
    retryPublish() {
      if (store.getState().phase === 'publish-error') publish();
    },
    reset() {
      if (store.getState().phase !== 'success') return;
      store.setState({
        values: defaults(),
        phase: 'editing',
        error: '',
        packetId: null,
        messageKey: null,
      });
      owner = null;
    },
    dispose() {
      generation++;
      request?.abort();
      request = null;
      unsubscribe?.();
      unsubscribe = undefined;
      owner = null;
    },
  };
}
export type RedPacketCreation = ReturnType<typeof createRedPacketCreation>;
