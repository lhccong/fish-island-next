import { expect, it, vi } from 'vitest';
import { LuckyBagCreateError, type LuckyBagDetail, type LuckyBagPort } from '@/domain/chat';
import { createLuckyBagController } from './lucky-bag-controller';
import { createLuckyBagCreation } from './lucky-bag-creation';

const bag: LuckyBagDetail = {
  id: 'lb_synthetic',
  name: '合成福袋',
  creatorName: '合成岛友',
  totalAmount: 50,
  winnerCount: 5,
  participantCount: 0,
  type: 1,
  status: 0,
  joined: false,
  drawTime: Date.now() + 60000,
};
function port(): LuckyBagPort {
  return {
    create: vi.fn().mockResolvedValue(bag),
    detail: vi.fn().mockResolvedValue(bag),
    join: vi.fn().mockResolvedValue(undefined),
    active: vi.fn().mockResolvedValue([]),
    records: vi.fn().mockResolvedValue([]),
  };
}
it('deduplicates participation and preserves confirmed participation across stale details and remounts', async () => {
  const service = port();
  const controller = createLuckyBagController(service, 'synthetic');
  const entry = controller.entry(bag.id);
  await entry.load();
  await Promise.all([entry.join(), entry.join()]);
  expect(service.join).toHaveBeenCalledOnce();
  expect(entry.store.getState().detail?.joined).toBe(true);
  entry.acceptSnapshot({ ...bag, joined: false });
  expect(entry.store.getState().detail?.joined).toBe(true);
  await entry.join();
  expect(service.join).toHaveBeenCalledOnce();
  const release = entry.retain();
  release();
  entry.retain()();
  expect(service.detail).toHaveBeenCalledTimes(2);
  controller.dispose();
});
it('retries failed participation but blocks ended or elapsed bags and cancels account requests', async () => {
  const service = port();
  vi.mocked(service.join).mockRejectedValueOnce(new Error('参与失败'));
  const controller = createLuckyBagController(service, 'synthetic');
  const entry = controller.entry(bag.id);
  await entry.load();
  await entry.join();
  expect(entry.store.getState().joinError).toBe('参与失败');
  await entry.join();
  expect(entry.store.getState().feedback).toContain('参与成功');
  for (const detail of [
    { ...bag, status: 1 as const },
    { ...bag, drawTime: 1 },
  ]) {
    const closed = controller.entry(`closed-${detail.status}-${detail.drawTime}`, detail);
    await closed.join();
  }
  expect(service.join).toHaveBeenCalledTimes(2);
  let signal: AbortSignal | undefined;
  vi.mocked(service.detail).mockImplementation((_id, current) => {
    signal = current;
    return new Promise(() => {});
  });
  void entry.load();
  controller.dispose();
  expect(signal?.aborted).toBe(true);
});
it('keeps creation across closing, guards account and duplicate submits, and locks uncertain writes', async () => {
  const service = port();
  const creation = createLuckyBagCreation(service, 'synthetic');
  await creation.submit('another-account');
  expect(service.create).not.toHaveBeenCalled();
  await Promise.all([creation.submit('synthetic'), creation.submit('synthetic')]);
  expect(service.create).toHaveBeenCalledOnce();
  expect(creation.store.getState().phase).toBe('success');
  creation.reset();
  vi.mocked(service.create).mockRejectedValueOnce(new LuckyBagCreateError('rejected', '积分不足'));
  await creation.submit('synthetic');
  expect(creation.store.getState().phase).toBe('editing');
  vi.mocked(service.create).mockRejectedValueOnce(
    new LuckyBagCreateError('uncertain', '请勿重复提交'),
  );
  await creation.submit('synthetic');
  await creation.submit('synthetic');
  expect(creation.store.getState().phase).toBe('uncertain');
  expect(service.create).toHaveBeenCalledTimes(3);
});
