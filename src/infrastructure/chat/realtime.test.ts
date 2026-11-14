import { afterEach, expect, it, vi } from 'vitest';
import { createChatRealtime } from './realtime';

class Socket {
  static CONNECTING = 0;
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  url: string;
  constructor(url: string) {
    this.url = url;
    Socket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Socket.instances = [];
});
it('owns one socket, logs in, heartbeats, reconnects, stops on auth failure and releases listeners', () => {
  vi.useFakeTimers();
  const target = new EventTarget();
  vi.stubGlobal('window', target);
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('WebSocket', Socket);
  const expired = vi.fn();
  const state = vi.fn();
  const port = createChatRealtime(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic-value' }),
    expired,
  );
  const connection = port.connect(vi.fn(), state);
  vi.advanceTimersByTime(1);
  const first = Socket.instances[0]!;
  first.open();
  expect(first.send).toHaveBeenCalledWith('{"type":1}');
  vi.advanceTimersByTime(25000);
  expect(first.send).toHaveBeenCalledWith('{"type":4}');
  first.onclose?.({ code: 1006 });
  vi.advanceTimersByTime(1001);
  expect(Socket.instances).toHaveLength(2);
  const second = Socket.instances[1]!;
  second.open();
  expect(connection.revoke('7')).toBe(true);
  expect(JSON.parse(second.send.mock.calls.at(-1)![0] as string)).toEqual({
    type: 2,
    userId: -1,
    data: { type: 'userMessageRevoke', content: '7' },
  });
  second.onclose?.({ code: 4401 });
  expect(expired).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(60000);
  expect(Socket.instances).toHaveLength(2);
  connection.close();
  target.dispatchEvent(new Event('online'));
  expect(vi.getTimerCount()).toBe(0);
});
it('StrictMode setup/cleanup does not create an abandoned connection', () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('WebSocket', Socket);
  const port = createChatRealtime('https://example.test', () => null, vi.fn());
  port.connect(vi.fn(), vi.fn()).close();
  vi.runAllTimers();
  expect(Socket.instances).toHaveLength(0);
});

it('dispatches game frames through the same connection and disables the extension on disconnect', () => {
  vi.useFakeTimers();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('WebSocket', Socket);
  const receive = vi.fn();
  let send: ((frame: unknown) => boolean) | null = null;
  const connection = createChatRealtime(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic-value' }),
    vi.fn(),
    {
      receive,
      connection: (_status, sender) => {
        send = sender;
      },
    },
  ).connect(vi.fn(), vi.fn());
  vi.advanceTimersByTime(1);
  const socket = Socket.instances[0]!;
  socket.open();
  const gameSend = send as unknown as (frame: unknown) => boolean;
  expect(
    gameSend({
      type: 2,
      userId: -1,
      data: { type: 'createChessRoom', content: { gameType: 'normal' } },
    }),
  ).toBe(true);
  socket.onmessage?.({ data: '{"type":"createChessRoom","data":"12345"}' });
  expect(receive).toHaveBeenCalledOnce();
  expect(Socket.instances).toHaveLength(1);
  socket.onclose?.({ code: 1006 });
  expect(send).toBeNull();
  connection.close();
  expect(vi.getTimerCount()).toBe(0);
});

it('pauses offline, resumes online and reconnects a timed out handshake', () => {
  vi.useFakeTimers();
  const target = new EventTarget();
  const network = { onLine: false };
  vi.stubGlobal('window', target);
  vi.stubGlobal('navigator', network);
  vi.stubGlobal('WebSocket', Socket);
  const state = vi.fn();
  const connection = createChatRealtime(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic-value' }),
    vi.fn(),
  ).connect(vi.fn(), state);
  vi.advanceTimersByTime(1);
  expect(state).toHaveBeenLastCalledWith('offline');
  expect(Socket.instances).toHaveLength(0);
  network.onLine = true;
  target.dispatchEvent(new Event('online'));
  expect(Socket.instances).toHaveLength(1);
  vi.advanceTimersByTime(16001);
  expect(Socket.instances).toHaveLength(2);
  Socket.instances[1]!.open();
  network.onLine = false;
  target.dispatchEvent(new Event('offline'));
  vi.advanceTimersByTime(120000);
  expect(Socket.instances).toHaveLength(2);
  expect(connection.revoke('1')).toBe(false);
  connection.close();
  expect(vi.getTimerCount()).toBe(0);
});

function reconnectFixture() {
  vi.useFakeTimers();
  const target = new EventTarget();
  const network = { onLine: true };
  vi.stubGlobal('window', target);
  vi.stubGlobal('navigator', network);
  vi.stubGlobal('WebSocket', Socket);
  const state = vi.fn();
  const expired = vi.fn();
  const connection = createChatRealtime(
    'https://example.test',
    () => ({ name: 'synthetic', value: 'synthetic-value' }),
    expired,
  ).connect(vi.fn(), state);
  vi.advanceTimersByTime(1);
  return { target, network, connection, state, expired };
}
it('retries immediately on return while reusing open and connecting sockets', () => {
  const fixture = reconnectFixture();
  fixture.connection.retry();
  expect(Socket.instances).toHaveLength(1);
  Socket.instances[0]!.open();
  fixture.connection.retry();
  expect(Socket.instances).toHaveLength(1);
  Socket.instances[0]!.onclose?.({ code: 1006 });
  fixture.connection.retry();
  expect(Socket.instances).toHaveLength(2);
  Socket.instances[1]!.open();
  vi.advanceTimersByTime(1001);
  expect(Socket.instances).toHaveLength(2);
  Socket.instances[1]!.onclose?.({ code: 4401 });
  fixture.connection.retry();
  expect(Socket.instances).toHaveLength(2);
  fixture.connection.close();
  expect(vi.getTimerCount()).toBe(0);
});
it.each([0, 0.999999])(
  'backs off exponentially through rapid open/close loops and keeps retrying at the cap (jitter %s)',
  (random) => {
    const fixture = reconnectFixture();
    const jitter = vi.spyOn(Math, 'random').mockReturnValue(random);
    for (const base of [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]) {
      const count = Socket.instances.length;
      const socket = Socket.instances.at(-1)!;
      socket.open();
      socket.onclose?.({ code: 1006 });
      expect(fixture.state).toHaveBeenLastCalledWith('reconnecting');
      const delay = Math.floor(base * (0.75 + random * 0.25));
      vi.advanceTimersByTime(delay - 1);
      expect(Socket.instances).toHaveLength(count);
      vi.advanceTimersByTime(1);
      expect(Socket.instances).toHaveLength(count + 1);
    }
    fixture.connection.close();
    expect(vi.getTimerCount()).toBe(0);
    jitter.mockRestore();
  },
);
it('resets only after 30 stable seconds and clears scheduled work while offline or stopped', () => {
  const fixture = reconnectFixture();
  const jitter = vi.spyOn(Math, 'random').mockReturnValue(0);
  const latest = () => Socket.instances.at(-1)!;
  latest().open();
  latest().onclose?.({ code: 1006 });
  vi.advanceTimersByTime(750);
  latest().open();
  latest().onclose?.({ code: 1006 });
  vi.advanceTimersByTime(1500);
  latest().open();
  vi.advanceTimersByTime(30000);
  latest().onclose?.({ code: 1006 });
  const count = Socket.instances.length;
  vi.advanceTimersByTime(749);
  expect(Socket.instances).toHaveLength(count);
  vi.advanceTimersByTime(1);
  expect(Socket.instances).toHaveLength(count + 1);
  latest().onerror?.();
  fixture.network.onLine = false;
  fixture.target.dispatchEvent(new Event('offline'));
  vi.advanceTimersByTime(120000);
  expect(Socket.instances).toHaveLength(count + 1);
  fixture.network.onLine = true;
  fixture.target.dispatchEvent(new Event('online'));
  expect(Socket.instances).toHaveLength(count + 2);
  // Repeated online events cannot create overlapping handshakes.
  fixture.target.dispatchEvent(new Event('online'));
  expect(Socket.instances).toHaveLength(count + 2);
  fixture.connection.close();
  fixture.target.dispatchEvent(new Event('online'));
  vi.advanceTimersByTime(120000);
  expect(Socket.instances).toHaveLength(count + 2);
  expect(vi.getTimerCount()).toBe(0);
  jitter.mockRestore();
});
