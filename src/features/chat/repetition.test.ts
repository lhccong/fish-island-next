import { expect, it } from 'vitest';
import type { ReceivedMessage } from '@/domain/chat';
import { createMessageStore } from './message-store';
const message = (id: string, extra: Partial<ReceivedMessage> = {}): ReceivedMessage => ({
  id,
  senderId: id,
  senderName: id,
  content: '合成复读',
  createdAt: Number(id),
  revoked: false,
  ...extra,
});
const apply = (model: ReturnType<typeof createMessageStore>, ...messages: ReceivedMessage[]) =>
  model.apply(messages.map((message) => ({ type: 'message', message })));
it('offers +1 on the second exact match and collapses only at three, retaining entities', () => {
  const model = createMessageStore();
  apply(model, message('1'), message('2'));
  expect(model.store.getState().visibleIds).toEqual(['1', '2']);
  expect(model.store.getState().repetitions['2']).toEqual(['1', '2']);
  apply(model, message('3'), message('3'));
  expect(model.store.getState().visibleIds).toEqual(['1']);
  expect(model.store.getState().ids).toEqual(['1', '2', '3']);
  const group = model.store.getState().repetitions['1'];
  apply(model, message('4', { content: '分隔' }));
  expect(model.store.getState().repetitions['1']).toBe(group);
  model.apply([{ type: 'revoke', id: '2' }]);
  expect(model.store.getState().visibleIds).toEqual(['1', '2', '3', '4']);
  expect(model.store.getState().repetitions).toEqual({});
});
it.each([
  { content: '合成复读 ' },
  { quote: { id: 'q', senderName: '引用', content: '引用' } },
  { revoked: true },
  { delivery: 'sending' as const },
  { delivery: 'failed' as const },
  { content: '[redpacket]123[/redpacket]' },
  { content: '[luckybag]lb_synthetic[/luckybag]' },
  { content: ' ' },
])('breaks the run for ineligible or different messages: %j', (extra) => {
  const model = createMessageStore();
  apply(model, message('1'), message('2', extra), message('3'));
  expect(model.store.getState().visibleIds).toEqual(['1', '2', '3']);
  expect(model.store.getState().repetitions).toEqual({});
});
it('groups identical images but never groups identical prize messages or whitespace', () => {
  for (const content of ['[redpacket]123[/redpacket]', '[luckybag]lb_synthetic[/luckybag]', ' ']) {
    const model = createMessageStore();
    apply(model, ...['1', '2', '3'].map((id) => message(id, { content })));
    expect(model.store.getState().visibleIds).toHaveLength(3);
  }
  const model = createMessageStore();
  apply(
    model,
    ...['1', '2', '3'].map((id) =>
      message(id, { content: '[img]https://images.test/a.png[/img]' }),
    ),
  );
  expect(model.store.getState().visibleIds).toEqual(['1']);
});
it('waits for HTTP confirmation and recalculates after delivery changes and reset', () => {
  const model = createMessageStore();
  apply(model, message('1'), message('2'), message('3', { delivery: 'sending' }));
  expect(model.store.getState().visibleIds).toHaveLength(3);
  model.updateDelivery('3', 'failed', '合成失败');
  expect(model.store.getState().visibleIds).toHaveLength(3);
  model.updateDelivery('3', 'sent');
  expect(model.store.getState().visibleIds).toEqual(['1']);
  model.reset();
  expect(model.store.getState().visibleIds).toEqual([]);
  expect(model.store.getState().repetitions).toEqual({});
});
it('preserves a visible historical anchor when older rows are prepended', () => {
  const model = createMessageStore();
  apply(model, message('4', { content: '锚点' }), message('5'));
  const before = model.store.getState().viewFirstItemIndex;
  apply(model, message('1'), message('2'), message('3'));
  const state = model.store.getState();
  expect(state.visibleIds).toEqual(['1', '4', '5']);
  expect(state.viewFirstItemIndex + state.visibleIds.indexOf('4')).toBe(before);
});
