import { createStore } from 'zustand/vanilla';

interface ChatDraftState {
  text: string;
  quote: { id: string; senderName: string } | null;
  feedback: { kind: 'info' | 'error'; text: string } | null;
}
export function createChatDraft(ownerId: string) {
  const store = createStore<ChatDraftState>(() => ({ text: '', quote: null, feedback: null }));
  const notify = (text: string, kind: 'info' | 'error' = 'info') =>
    store.setState({ feedback: { text, kind } });
  return {
    ownerId,
    store,
    notify,
    setText(text: string) {
      store.setState({ text, feedback: null });
    },
    quote(id: string, senderName: string) {
      store.setState({ quote: { id, senderName } });
      notify('已引用消息');
    },
    clearQuote() {
      store.setState({ quote: null, feedback: null });
    },
    mention(name: string) {
      const text = `@${name.trim().replace(/\s+/g, ' ') || '岛友'} `;
      store.setState((state) => ({
        text: state.text + (state.text && !/\s$/.test(state.text) ? ' ' : '') + text,
      }));
      notify('已将提及放入草稿');
    },
    repeat(content: string) {
      store.setState((state) => ({
        text: state.text + (state.text && !state.text.endsWith('\n') ? '\n' : '') + content,
      }));
      notify('已将消息追加到草稿');
    },
  };
}
export type ChatDraft = ReturnType<typeof createChatDraft>;
