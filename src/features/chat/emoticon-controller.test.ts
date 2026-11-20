import { expect, it, vi } from 'vitest';
import { createEmoticonController } from './emoticon-controller';
import type { ChatEmoticonPort } from '@/domain/chat';

it('serializes mutations, aborts old account requests and suppresses late success', async () => {
  let complete!: () => void;
  let signal!: AbortSignal;
  const port: ChatEmoticonPort = {
    add: vi.fn((_url, request) => {
      signal = request;
      return new Promise<void>((resolve) => {
        complete = resolve;
      });
    }),
    remove: vi.fn(),
    list: vi.fn(),
    search: vi.fn(),
  };
  const controller = createEmoticonController(port, 'synthetic-owner', { upload: vi.fn() });
  const first = controller.add('https://image.test/a.gif');
  await controller.add('https://image.test/a.gif');
  expect(port.add).toHaveBeenCalledOnce();
  expect(controller.store.getState().pending).toBe(true);
  controller.dispose();
  expect(signal.aborted).toBe(true);
  complete();
  await first;
  expect(controller.store.getState().revision).toBe(0);
});
it('reports failure without invalidating the list and can retry after failure', async () => {
  const port: ChatEmoticonPort = {
    add: vi.fn().mockRejectedValueOnce(new Error('合成失败')).mockResolvedValueOnce(undefined),
    remove: vi.fn(),
    list: vi.fn(),
    search: vi.fn(),
  };
  const controller = createEmoticonController(port, 'synthetic-owner', { upload: vi.fn() });
  controller.dispose();
  controller.start();
  await controller.add('https://image.test/a.gif');
  expect(controller.store.getState()).toMatchObject({ revision: 0, pending: false, error: true });
  await controller.add('https://image.test/a.gif');
  expect(controller.store.getState()).toMatchObject({
    revision: 1,
    pending: false,
    error: false,
    feedback: '已添加到表情包',
  });
});

it('does not save a local image if the account leaves before the upload completes', async () => {
  const port: ChatEmoticonPort = { add: vi.fn(), remove: vi.fn(), list: vi.fn(), search: vi.fn() };
  let finish!: (url: string) => void;
  const upload = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  );
  const controller = createEmoticonController(port, 'synthetic-owner', { upload });
  const pending = controller.upload(new File(['gif'], 'sticker.gif', { type: 'image/gif' }));
  await vi.waitFor(() => expect(upload).toHaveBeenCalledOnce());
  controller.dispose();
  finish('https://image.test/sticker.gif');
  await pending;
  expect(port.add).not.toHaveBeenCalled();
  expect(controller.store.getState().revision).toBe(0);
});

it('shares a keyword search across rows and releases it on account disposal', async () => {
  const items = [
    { id: 'b', url: 'https://image.test/b.gif' },
    { id: 'a', url: 'https://image.test/a.gif' },
  ];
  const search = vi.fn<ChatEmoticonPort['search']>().mockResolvedValue({ items, total: 2 });
  const port: ChatEmoticonPort = { add: vi.fn(), remove: vi.fn(), list: vi.fn(), search };
  const controller = createEmoticonController(port, 'synthetic-owner', { upload: vi.fn() });

  const first = controller.searchForBigFish('开心');
  expect(controller.searchForBigFish('开心')).toBe(first);
  await expect(first).resolves.toEqual(['https://image.test/a.gif', 'https://image.test/b.gif']);
  expect(search).toHaveBeenCalledOnce();
  expect(search.mock.calls[0]?.slice(0, 2)).toEqual(['开心', 1]);

  controller.dispose();
  expect(search.mock.calls[0]?.[2].aborted).toBe(true);
  controller.start();
  expect(controller.searchForBigFish('开心')).not.toBe(first);
  expect(search).toHaveBeenCalledTimes(2);
});
