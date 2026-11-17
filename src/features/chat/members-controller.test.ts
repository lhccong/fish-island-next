import { expect, it, vi } from 'vitest';
import type { OnlineMember } from '@/domain/chat';
import { createMembersController } from './members-controller';

const member = (id: string, name = id): OnlineMember => ({ id, name, avatar: null });
function deferred() {
  let resolve!: (members: readonly OnlineMember[]) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<readonly OnlineMember[]>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it('shares cached snapshots, upserts by ID and removes members idempotently', () => {
  const loadOnlineMembers = vi.fn();
  const controller = createMembersController({ loadOnlineMembers });
  controller.receive({ type: 'members-snapshot', members: [member('a'), member('a')] });
  controller.load();
  expect(loadOnlineMembers).not.toHaveBeenCalled();
  controller.receive({ type: 'members-online', members: [member('a', 'updated'), member('b')] });
  controller.receive({ type: 'members-online', members: [member('b')] });
  controller.receive({ type: 'member-offline', id: 'missing' });
  controller.receive({ type: 'member-offline', id: 'a' });
  controller.receive({ type: 'member-offline', id: 'a' });
  expect(controller.store.getState().state).toMatchObject({
    status: 'success',
    members: [member('b')],
  });
  controller.receive({ type: 'members-snapshot', members: [] });
  expect(controller.store.getState().state).toMatchObject({ status: 'success', members: [] });
});

it('replays live changes over a late HTTP response and allows one request in flight', async () => {
  const pending = deferred();
  const loadOnlineMembers = vi.fn(() => pending.promise);
  const controller = createMembersController({ loadOnlineMembers });
  const request = controller.refresh();
  controller.load();
  await controller.refresh();
  expect(loadOnlineMembers).toHaveBeenCalledOnce();
  controller.receive({ type: 'members-online', members: [member('b', 'new')] });
  controller.receive({ type: 'member-offline', id: 'a' });
  controller.receive({ type: 'members-online', members: [member('c')] });
  controller.receive({ type: 'member-offline', id: 'c' });
  pending.resolve([member('a'), member('b', 'old')]);
  await request;
  expect(controller.store.getState().state).toMatchObject({ members: [member('b', 'new')] });
});

it.each(['resolve', 'reject'] as const)(
  'a WS full snapshot cancels HTTP and ignores its late %s after reconnect',
  async (completion) => {
    const pending = deferred();
    let signal!: AbortSignal;
    const controller = createMembersController({
      loadOnlineMembers(input) {
        signal = input;
        return pending.promise;
      },
    });
    const request = controller.refresh();
    controller.receive({ type: 'members-snapshot', members: [member('fresh')] });
    expect(signal.aborted).toBe(true);
    if (completion === 'resolve') pending.resolve([member('stale')]);
    else pending.reject(new Error('late failure'));
    await request;
    expect(controller.store.getState().state).toMatchObject({ members: [member('fresh')] });
  },
);

it('keeps errors retryable and cancels requests and memory on account reset', async () => {
  const pending = deferred();
  let signal!: AbortSignal;
  const controller = createMembersController({
    loadOnlineMembers: vi
      .fn()
      .mockRejectedValueOnce(new Error('synthetic failure'))
      .mockImplementationOnce((input: AbortSignal) => {
        signal = input;
        return pending.promise;
      })
      .mockResolvedValue([member('new-account')]),
  });
  await controller.refresh();
  expect(controller.store.getState().state).toEqual({
    status: 'error',
    message: 'synthetic failure',
  });
  const request = controller.refresh();
  controller.reset();
  expect(signal.aborted).toBe(true);
  pending.resolve([member('old-account')]);
  await request;
  expect(controller.store.getState().state).toEqual({ status: 'idle' });
  await controller.refresh();
  expect(controller.store.getState().state).toMatchObject({ members: [member('new-account')] });
});
