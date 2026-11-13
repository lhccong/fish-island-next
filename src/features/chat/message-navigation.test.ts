import { afterEach, describe, it, expect, vi } from 'vitest';
import type { ChatEvent, ReceivedMessage } from '@/domain/chat';
import { createChatRealtimeController } from './realtime-controller';
import { createMessageNavigation, mentionsUser } from './message-navigation';

const message = (id: string, content = '正文'): ReceivedMessage => ({
  id,
  content,
  senderId: 'other',
  senderName: '岛友',
  createdAt: Number(id),
  revoked: false,
});
function setup() {
  let receive!: (event: ChatEvent) => void;
  const loadHistory = vi.fn().mockResolvedValue({ messages: [], nextCursor: null });
  const chat = createChatRealtimeController(
    {
      connect(onEvent) {
        receive = onEvent;
        return { close() {}, retry() {}, revoke: () => true };
      },
    },
    { loadHistory },
  );
  const stop = chat.start();
  const nav = createMessageNavigation(chat);
  const unwatch = nav.start('self', '本人');
  return {
    chat,
    nav,
    receive,
    loadHistory,
    dispose() {
      unwatch();
      stop();
    },
  };
}
describe('message navigation', () => {
  afterEach(() => vi.useRealTimers());

  it('dismisses successful feedback while preserving other mentions and the scroll target', async () => {
    vi.useFakeTimers();
    const f = setup();
    f.chat.store.setState({ ids: ['1'], visibleIds: ['1'], messages: { '1': message('1') } });
    f.nav.store.setState({ mentions: ['1', '2'] });
    await f.nav.locate('1');
    expect(f.nav.store.getState().feedback).toBe('已定位消息');
    await vi.advanceTimersByTimeAsync(2500);
    expect(f.nav.store.getState()).toMatchObject({ feedback: '', target: '1', mentions: ['2'] });
    f.dispose();
  });

  it('restarts the success timeout and never clears a later lookup or error', async () => {
    vi.useFakeTimers();
    const f = setup();
    f.chat.store.setState({ ids: ['1'], visibleIds: ['1'], messages: { '1': message('1') } });
    await f.nav.locate('1');
    await vi.advanceTimersByTimeAsync(2000);
    await f.nav.locate('1');
    await vi.advanceTimersByTimeAsync(500);
    expect(f.nav.store.getState().feedback).toBe('已定位消息');
    const lookup = f.nav.locate('missing');
    await vi.advanceTimersByTimeAsync(2500);
    expect(f.nav.store.getState().feedback).toBe('正在定位消息…');
    f.chat.history.store.setState({ status: 'error', error: 'synthetic failure' });
    await lookup;
    await vi.advanceTimersByTimeAsync(2500);
    expect(f.nav.store.getState().feedback).toBe('历史消息加载失败，请重试定位');
    f.dispose();
  });

  it('cleans up successful feedback and its timer on disposal', async () => {
    vi.useFakeTimers();
    const f = setup();
    f.chat.store.setState({ ids: ['1'], visibleIds: ['1'], messages: { '1': message('1') } });
    await f.nav.locate('1');
    f.dispose();
    const listener = vi.fn();
    const unsubscribe = f.nav.store.subscribe(listener);
    await vi.advanceTimersByTimeAsync(2500);
    expect(listener).not.toHaveBeenCalled();
    expect(f.nav.store.getState().feedback).toBe('');
    unsubscribe();
  });

  it('matches complete textual mentions, excluding names with the same prefix and images', () => {
    expect(mentionsUser(message('1', '@本人 请查看'), 'self', '本人')).toBe(true);
    expect(mentionsUser(message('1', '你好，@本人！'), 'self', '本人')).toBe(true);
    expect(mentionsUser(message('1', '@本人甲 请查看'), 'self', '本人')).toBe(false);
    expect(
      mentionsUser(message('1', '[img]https://test.invalid/@本人[/img]'), 'self', '本人'),
    ).toBe(false);
    expect(mentionsUser({ ...message('1', '@本人 '), senderId: 'self' }, 'self', '本人')).toBe(
      false,
    );
  });
  it('deduplicates incoming alerts and clears revoked alerts without treating history as new', async () => {
    vi.useFakeTimers();
    const f = setup();
    f.chat.store.setState({ messages: { '0': message('0', '@本人 历史') }, ids: ['0'] });
    f.receive({ type: 'message', message: message('1', '@本人 请查看') });
    f.receive({ type: 'message', message: message('1', '@本人 请查看') });
    await vi.advanceTimersByTimeAsync(20);
    expect(f.nav.store.getState().mentions).toEqual(['1']);
    f.receive({ type: 'revoke', id: '1' });
    await vi.advanceTimersByTimeAsync(20);
    expect(f.nav.store.getState().mentions).toEqual([]);
    f.dispose();
    vi.useRealTimers();
  });
  it('finds folded repetition rows and confirmed local rendering keys', async () => {
    const f = setup();
    f.chat.store.setState({
      ids: ['local'],
      visibleIds: ['local'],
      messages: { local: message('8') },
    });
    await f.nav.locate('8');
    expect(f.nav.store.getState().target).toBe('local');
    f.chat.store.setState({
      ids: ['1', '2', '3'],
      visibleIds: ['1'],
      messages: { '1': message('1'), '2': message('2'), '3': message('3') },
      repetitions: { '1': ['1', '2', '3'] },
    });
    await f.nav.locate('3');
    expect(f.nav.store.getState().target).toBe('1');
    f.dispose();
  });
  it('loads older history serially and reports missing messages', async () => {
    const f = setup();
    f.chat.history.store.setState({ status: 'ready', initialized: true });
    const deactivate = f.chat.history.activate();
    f.chat.history.store.setState({ status: 'ready', initialized: true });
    f.loadHistory.mockResolvedValueOnce({ messages: [message('1')], nextCursor: 'older' });
    await f.nav.locate('1');
    expect(f.nav.store.getState().target).toBe('1');
    await f.nav.locate('missing');
    expect(f.nav.store.getState().feedback).toContain('未找到原文');
    expect(f.loadHistory).toHaveBeenCalledTimes(2);
    deactivate();
    f.dispose();
  });
  it('stops after a history failure and permits an explicit retry', async () => {
    const f = setup();
    const deactivate = f.chat.history.activate();
    f.chat.history.store.setState({ status: 'ready', initialized: true });
    f.loadHistory.mockRejectedValueOnce(new Error('synthetic failure'));
    await f.nav.locate('1');
    expect(f.loadHistory).toHaveBeenCalledTimes(1);
    expect(f.nav.store.getState().feedback).toContain('加载失败');
    f.loadHistory.mockResolvedValueOnce({ messages: [message('1')], nextCursor: null });
    await f.nav.locate('1');
    expect(f.nav.store.getState().target).toBe('1');
    deactivate();
    f.dispose();
  });
  it('cancels an outstanding lookup without a late jump', async () => {
    const f = setup();
    const lookup = f.nav.locate('1');
    f.nav.cancel();
    await lookup;
    expect(f.nav.store.getState().target).toBeNull();
    f.dispose();
  });
});
