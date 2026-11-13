import { afterEach, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/domain/auth';
import { RedPacketCreateError, type RedPacketPort, type SendMessageInput } from '@/domain/chat';
import { createChatRealtimeController } from './realtime-controller';
import { createRedPacketCreation } from './red-packet-creation';

const user: AuthUser = { id: '123', name: '合成用户', avatarUrl: null, role: 'user' };
const disposers: Array<() => void> = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
});
function fixture() {
  const port: RedPacketPort = {
    create: vi.fn().mockResolvedValue('rpc_synthetic'),
    detail: vi.fn(),
    grab: vi.fn(),
    records: vi.fn(),
  };
  const send = vi.fn(async (input: SendMessageInput) => ({
    id: 'confirmed-1',
    senderId: user.id,
    senderName: user.name,
    content: input.content,
    clientMessageId: input.clientMessageId,
    createdAt: Date.now(),
    revoked: false,
  }));
  const chat = createChatRealtimeController({ connect: vi.fn() }, undefined, { send });
  const creation = createRedPacketCreation(port, user.id, chat);
  creation.start();
  disposers.push(creation.dispose, chat.sender.reset);
  return { port, send, chat, creation };
}
it('creates once while pending and only reports success after message confirmation', async () => {
  const { port, send, creation } = fixture();
  let releaseCreate!: (id: string) => void;
  let releaseSend!: () => void;
  vi.mocked(port.create).mockReturnValueOnce(
    new Promise((resolve) => {
      releaseCreate = resolve;
    }),
  );
  const gate = new Promise<void>((resolve) => {
    releaseSend = resolve;
  });
  send.mockImplementationOnce(async (input) => {
    await gate;
    return {
      id: 'confirmed-1',
      senderId: user.id,
      senderName: user.name,
      content: input.content,
      clientMessageId: input.clientMessageId,
      createdAt: Date.now(),
      revoked: false,
    };
  });
  const pending = creation.submit(user);
  await creation.submit(user);
  expect(port.create).toHaveBeenCalledTimes(1);
  expect(creation.store.getState().phase).toBe('creating');
  releaseCreate('rpc_synthetic');
  await pending;
  expect(creation.store.getState().phase).toBe('publishing');
  releaseSend();
  await vi.waitFor(() => expect(creation.store.getState().phase).toBe('success'));
  await creation.submit(user);
  expect(port.create).toHaveBeenCalledTimes(1);
});
it('retries the same publication without recreating or changing clientMessageId', async () => {
  const { port, send, creation } = fixture();
  send.mockRejectedValueOnce(new Error('synthetic publication failure'));
  await creation.submit(user);
  await vi.waitFor(() => expect(creation.store.getState().phase).toBe('publish-error'));
  const first = send.mock.calls[0]![0];
  creation.retryPublish();
  await vi.waitFor(() => expect(creation.store.getState().phase).toBe('success'));
  expect(port.create).toHaveBeenCalledTimes(1);
  expect(send.mock.calls[1]![0]).toEqual(first);
  expect(first.content).toBe('[redpacket]rpc_synthetic[/redpacket]');
});
it('retains a created packet when the send queue is full', async () => {
  const { port, chat, creation } = fixture();
  vi.spyOn(chat.sender, 'enqueue').mockReturnValueOnce(null);
  await creation.submit(user);
  expect(creation.store.getState()).toMatchObject({
    phase: 'publish-error',
    packetId: 'rpc_synthetic',
    messageKey: null,
  });
  creation.retryPublish();
  await vi.waitFor(() => expect(creation.store.getState().phase).toBe('success'));
  expect(port.create).toHaveBeenCalledTimes(1);
});
it('allows business rejection recovery but locks an unknown creation result', async () => {
  const { port, creation } = fixture();
  vi.mocked(port.create).mockRejectedValueOnce(new RedPacketCreateError('rejected', '积分不足'));
  await creation.submit(user);
  expect(creation.store.getState()).toMatchObject({ phase: 'editing', error: '积分不足' });
  vi.mocked(port.create).mockRejectedValueOnce(new RedPacketCreateError('uncertain', '结果未确认'));
  await creation.submit(user);
  expect(creation.store.getState().phase).toBe('uncertain');
  creation.reset();
  await creation.submit(user);
  expect(port.create).toHaveBeenCalledTimes(2);
});
it('blocks invalid input and ignores a create response after account disposal', async () => {
  const { port, send, creation } = fixture();
  creation.setValues({ totalAmount: '' });
  await creation.submit(user);
  expect(port.create).not.toHaveBeenCalled();
  creation.setValues({ totalAmount: '10' });
  let release!: (id: string) => void;
  vi.mocked(port.create).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const pending = creation.submit(user);
  const signal = vi.mocked(port.create).mock.calls[0]![1];
  creation.dispose();
  release('rpc_synthetic');
  await pending;
  expect(signal.aborted).toBe(true);
  expect(send).not.toHaveBeenCalled();
});

it('defaults to 100 points and 10 packets, retaining edits until successful reset', async () => {
  const { creation, port } = fixture();
  expect(creation.store.getState().values).toMatchObject({ totalAmount: '100', count: '10' });
  await creation.submit(user);
  await vi.waitFor(() => expect(creation.store.getState().phase).toBe('success'));
  expect(port.create).toHaveBeenCalledWith(
    expect.objectContaining({ totalAmount: 100, count: 10 }),
    expect.any(AbortSignal),
  );
  creation.reset();
  expect(creation.store.getState().values).toMatchObject({ totalAmount: '100', count: '10' });
});
