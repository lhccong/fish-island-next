import { createStore } from 'zustand/vanilla';
import {
  LuckyBagCreateError,
  validateLuckyBagForm,
  type LuckyBagFormValues,
  type LuckyBagPort,
  type LuckyBagDetail,
} from '@/domain/chat';

const defaults = (): LuckyBagFormValues => ({
  name: '快来参与福袋吧',
  type: 1,
  totalAmount: '50',
  winnerCount: '5',
  durationSeconds: '180',
});
interface CreationState {
  values: LuckyBagFormValues;
  phase: 'editing' | 'creating' | 'success' | 'uncertain';
  error: string;
}
export function createLuckyBagCreation(
  port: LuckyBagPort,
  accountId: string,
  onCreated?: (bag: LuckyBagDetail) => void,
) {
  const store = createStore<CreationState>(() => ({
    values: defaults(),
    phase: 'editing',
    error: '',
  }));
  let request: AbortController | null = null;
  return {
    store,
    setValues(patch: Partial<LuckyBagFormValues>) {
      if (store.getState().phase === 'editing')
        store.setState((state) => ({ values: { ...state.values, ...patch }, error: '' }));
    },
    async submit(userId: string | undefined) {
      if (!userId || userId !== accountId || request || store.getState().phase !== 'editing')
        return;
      let input;
      try {
        input = validateLuckyBagForm(store.getState().values);
      } catch (error) {
        store.setState({ error: error instanceof Error ? error.message : '请检查福袋内容' });
        return;
      }
      const current = new AbortController();
      request = current;
      store.setState({ phase: 'creating', error: '' });
      try {
        const bag = await port.create(input, current.signal);
        if (!current.signal.aborted) {
          onCreated?.(bag);
          store.setState({ phase: 'success' });
        }
      } catch (error) {
        if (!current.signal.aborted)
          store.setState({
            phase:
              error instanceof LuckyBagCreateError && error.kind === 'rejected'
                ? 'editing'
                : 'uncertain',
            error: error instanceof Error ? error.message : '创建结果未确认，请勿重复提交',
          });
      } finally {
        if (request === current) request = null;
      }
    },
    reset() {
      if (store.getState().phase === 'success')
        store.setState({ values: defaults(), phase: 'editing', error: '' });
    },
    dispose() {
      request?.abort();
      request = null;
    },
  };
}
export type LuckyBagCreation = ReturnType<typeof createLuckyBagCreation>;
