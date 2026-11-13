import { expect, it } from 'vitest';
import { createChatDraft } from './chat-draft';

it('prepares quote, mention and repetition without discarding existing input or retaining quoted bodies', () => {
  const draft = createChatDraft('synthetic-a');
  draft.setText('已有输入');
  draft.quote('123', '岛友');
  expect(draft.store.getState().quote).toEqual({ id: '123', senderName: '岛友' });
  draft.mention(' 合成\n岛友 ');
  expect(draft.store.getState().text).toBe('已有输入 @合成 岛友 ');
  draft.repeat('合成原文');
  expect(draft.store.getState().text).toBe('已有输入 @合成 岛友 \n合成原文');
  draft.clearQuote();
  expect(draft.store.getState().quote).toBeNull();
  expect(draft.store.getState().text).toContain('合成原文');
  expect(draft.store.getState().feedback).toBeNull();
  draft.notify('合成复制失败', 'error');
  draft.setText('继续输入');
  expect(draft.store.getState().feedback).toBeNull();
  expect(createChatDraft('synthetic-b').store.getState()).toEqual({
    text: '',
    quote: null,
    feedback: null,
  });
});
