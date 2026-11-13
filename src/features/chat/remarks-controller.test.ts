import { expect, it, vi } from 'vitest';
import type { ChatRemarksPort, UserRemarks } from '@/domain/chat';
import { createRemarksController } from './remarks-controller';

it('blocks writes before loading, retains other remarks, handles failure and clear', async () => {
  const port: ChatRemarksPort = {
    load: vi
      .fn()
      .mockRejectedValueOnce(new Error('读取失败'))
      .mockResolvedValue({ '456': '原备注', '789': '保留备注' }),
    save: vi.fn().mockRejectedValueOnce(new Error('保存失败')).mockResolvedValue(undefined),
  };
  const controller = createRemarksController(port);
  expect(await controller.save('456', '新备注')).toBe(false);
  await controller.load();
  expect(controller.store.getState().status).toBe('error');
  expect(await controller.save('456', '新备注')).toBe(false);
  expect(port.save).not.toHaveBeenCalled();
  await controller.load();
  expect(await controller.save('456', '新备注')).toBe(false);
  expect(controller.store.getState().remarks['456']).toBe('原备注');
  expect(await controller.save('456', ' 新备注 ')).toBe(true);
  expect(port.save).toHaveBeenLastCalledWith(
    { '456': '新备注', '789': '保留备注' },
    expect.any(AbortSignal),
  );
  await controller.save('456', '  ');
  expect(controller.store.getState().remarks).toEqual({ '789': '保留备注' });
});
it('serializes writes and suppresses late responses after account disposal', async () => {
  let complete!: () => void;
  let signal!: AbortSignal;
  const port: ChatRemarksPort = {
    load: async () => ({ '456': '原备注' }),
    save: vi.fn((_remarks, request) => {
      signal = request;
      return new Promise<void>((resolve) => {
        complete = resolve;
      });
    }),
  };
  const controller = createRemarksController(port);
  await controller.load();
  const first = controller.save('456', '新备注');
  expect(await controller.save('789', '重复提交')).toBe(false);
  expect(port.save).toHaveBeenCalledOnce();
  controller.dispose();
  expect(signal.aborted).toBe(true);
  complete();
  expect(await first).toBe(false);
  expect(controller.store.getState().remarks).toEqual({});
});
it('cancels stale loading and keeps the latest account snapshot', async () => {
  let complete!: (remarks: UserRemarks) => void;
  const port: ChatRemarksPort = {
    load: vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<UserRemarks>((resolve) => {
            complete = resolve;
          }),
      )
      .mockResolvedValue({ '456': '当前备注' }),
    save: vi.fn(),
  };
  const controller = createRemarksController(port);
  const first = controller.load();
  await controller.load();
  complete({ '456': '过期备注' });
  await first;
  expect(controller.store.getState().remarks).toEqual({ '456': '当前备注' });
});
