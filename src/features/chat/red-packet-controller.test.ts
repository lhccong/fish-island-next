import { expect, it, vi } from 'vitest';
import type { RedPacketDetail, RedPacketPort } from '@/domain/chat';
import { createRedPacketController } from './red-packet-controller';
const detail: RedPacketDetail = { type: 3, status: 0, remainingCount: 2, name: '合成题目' };
function fixture() {
  const port: RedPacketPort = {
    create: vi.fn(),
    detail: vi.fn().mockResolvedValue(detail),
    grab: vi.fn().mockResolvedValue(7),
    records: vi.fn().mockResolvedValue([]),
  };
  return { port, controller: createRedPacketController(port, 'synthetic-account') };
}
it('shares duplicate packets, prevents concurrent and successful repeat claims', async () => {
  const { port, controller } = fixture();
  const entry = controller.entry('rpc1');
  expect(controller.entry('rpc1')).toBe(entry);
  await entry.load();
  await entry.grab(' ');
  expect(port.grab).not.toHaveBeenCalled();
  expect(entry.store.getState().grabError).toBe('请先输入答案');
  let release!: (value: number) => void;
  vi.mocked(port.grab).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const claim = entry.grab(' 合成答案 ');
  await entry.grab('合成答案');
  expect(port.grab).toHaveBeenCalledTimes(1);
  release(0);
  await claim;
  expect(entry.store.getState().amount).toBe(0);
  await entry.grab('合成答案');
  expect(port.grab).toHaveBeenCalledTimes(1);
  expect(vi.mocked(port.grab).mock.calls[0]?.[1]).toBe('合成答案');
});
it('allows manual recovery and refreshes status after a rejected claim', async () => {
  const { port, controller } = fixture();
  const entry = controller.entry('rpc1');
  await entry.load();
  vi.mocked(port.grab).mockRejectedValueOnce(new Error('答案错误'));
  await entry.grab('wrong');
  expect(entry.store.getState()).toMatchObject({
    grabbing: false,
    amount: null,
    grabError: '答案错误',
  });
  expect(port.grab).toHaveBeenCalledTimes(1);
  await entry.grab('right');
  expect(entry.store.getState()).toMatchObject({ amount: 7, grabError: '' });
  vi.mocked(port.detail).mockResolvedValueOnce({ ...detail, status: 2 });
  const ended = controller.entry('expired');
  await ended.load();
  await ended.grab('right');
  expect(port.grab).toHaveBeenCalledTimes(2);
});
it('keeps a pending read across virtual row unmounts and ignores responses after account disposal', async () => {
  const { port, controller } = fixture();
  let release!: (value: RedPacketDetail) => void;
  vi.mocked(port.detail).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const entry = controller.entry('rpc1');
  const unmount = entry.retain();
  const signal = vi.mocked(port.detail).mock.calls[0]![1];
  unmount();
  expect(signal.aborted).toBe(false);
  expect(entry.store.getState().loading).toBe(true);
  const remount = entry.retain();
  expect(port.detail).toHaveBeenCalledTimes(1);
  release(detail);
  await Promise.resolve();
  expect(entry.store.getState().detail).toEqual(detail);
  remount();
  let resolveGrab!: (value: number) => void;
  vi.mocked(port.grab).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveGrab = resolve;
    }),
  );
  const pending = entry.grab('right');
  controller.dispose();
  resolveGrab(10);
  await pending;
  expect(entry.store.getState().amount).toBeNull();
});

it('aborts pending detail reads on account disposal', async () => {
  const { port, controller } = fixture();
  let release!: (value: RedPacketDetail) => void;
  vi.mocked(port.detail).mockReturnValueOnce(
    new Promise((resolve) => {
      release = resolve;
    }),
  );
  const entry = controller.entry('rpc1');
  const unmount = entry.retain();
  unmount();
  controller.dispose();
  expect(vi.mocked(port.detail).mock.calls[0]![1].aborted).toBe(true);
  release(detail);
  await Promise.resolve();
  expect(entry.store.getState().detail).toBeNull();
});
