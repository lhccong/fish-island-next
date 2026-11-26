import { afterEach, expect, it, vi } from 'vitest';
import type { ChatEmoticonPort } from '@/domain/chat';
import { createCachedChatEmoticons } from './emoticon-cache';

const pageData = { items: [{ id: '1', url: 'https://image.test/first.gif' }], total: 25 };
const emptyPage = { items: [], total: 0 };
const signal = () => new AbortController().signal;

function setup() {
  const network = {
    list: vi.fn<ChatEmoticonPort['list']>().mockResolvedValue(pageData),
    search: vi.fn<ChatEmoticonPort['search']>().mockResolvedValue(pageData),
    add: vi.fn<ChatEmoticonPort['add']>().mockResolvedValue(undefined),
    remove: vi.fn<ChatEmoticonPort['remove']>().mockResolvedValue(undefined),
  };
  const cache = createCachedChatEmoticons(network);
  cache.setOwner('owner-a');
  return { ...cache, network };
}

afterEach(() => vi.useRealTimers());

it('reuses pages by query and uses separate expiry windows for favorites and online search', async () => {
  vi.useFakeTimers();
  const { port, network } = setup();
  await port.list(1, signal());
  await port.list(1, signal());
  await port.list(1, signal(), '摸鱼');
  await port.search('摸鱼', 1, signal());
  await port.search('摸鱼表情', 1, signal());
  vi.advanceTimersByTime(59_000);
  await port.list(2, signal());
  await port.list(2, signal());
  expect(network.list).toHaveBeenCalledTimes(3);
  expect(network.search).toHaveBeenCalledOnce();

  vi.advanceTimersByTime(1_000);
  await port.list(1, signal());
  await port.list(2, signal());
  expect(network.list).toHaveBeenCalledTimes(5);
  await port.search('摸鱼', 1, signal());
  expect(network.search).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(240_000);
  await port.search('摸鱼', 1, signal());
  expect(network.search).toHaveBeenCalledTimes(2);
});

it('bounds cache size and keeps recently read pages', async () => {
  const { port, network } = setup();
  for (let index = 0; index < 64; index++) await port.list(1, signal(), String(index));
  await port.list(1, signal(), '0');
  await port.list(1, signal(), '64');
  await port.list(1, signal(), '0');
  expect(network.list).toHaveBeenCalledTimes(65);
  await port.list(1, signal(), '1');
  expect(network.list).toHaveBeenCalledTimes(66);
});

it('retries failed and empty filtered reads so asynchronously indexed favorites can appear', async () => {
  const { port, network } = setup();
  network.list
    .mockRejectedValueOnce(new Error('合成列表失败'))
    .mockResolvedValueOnce(emptyPage)
    .mockResolvedValueOnce(emptyPage);
  await expect(port.list(1, signal(), '摸鱼')).rejects.toThrow('合成列表失败');
  await expect(port.list(1, signal(), '摸鱼')).resolves.toEqual(emptyPage);
  await expect(port.list(1, signal())).resolves.toEqual(emptyPage);
  await expect(port.list(1, signal())).resolves.toEqual(emptyPage);
  await expect(port.list(1, signal(), '摸鱼')).resolves.toEqual(pageData);
  expect(network.list).toHaveBeenCalledTimes(4);
});

it('shares in-flight reads and only cancels when the last reader closes', async () => {
  const { port, network } = setup();
  let finish!: (data: typeof pageData) => void;
  network.list.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
  const first = new AbortController();
  const second = new AbortController();
  const one = port.list(1, first.signal);
  const two = port.list(1, second.signal);
  expect(network.list).toHaveBeenCalledOnce();
  first.abort();
  await expect(one).rejects.toMatchObject({ name: 'AbortError' });
  expect(network.list.mock.calls[0]?.[1].aborted).toBe(false);
  second.abort();
  await expect(two).rejects.toMatchObject({ name: 'AbortError' });
  expect(network.list.mock.calls[0]?.[1].aborted).toBe(true);
  finish(pageData);
  await port.list(1, signal());
  expect(network.list).toHaveBeenCalledTimes(2);
});

it('invalidates all favorite queries after successful writes and ignores late pages', async () => {
  const { port, network } = setup();
  await port.list(1, signal());
  await port.list(2, signal(), '摸鱼');
  await port.search('摸鱼', 1, signal());
  network.add.mockRejectedValueOnce(new Error('合成写入失败'));
  await expect(port.add(pageData.items[0]!.url, signal())).rejects.toThrow('合成写入失败');
  await port.list(1, signal());
  expect(network.list).toHaveBeenCalledTimes(2);

  let finish!: (data: typeof pageData) => void;
  network.list.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
  const stale = port.list(3, signal(), '摸鱼');
  await port.add(pageData.items[0]!.url, signal());
  finish(pageData);
  await stale;
  network.list.mockResolvedValue(emptyPage);
  await expect(port.list(1, signal())).resolves.toEqual(emptyPage);
  await expect(port.list(2, signal(), '摸鱼')).resolves.toEqual(emptyPage);
  await expect(port.list(3, signal(), '摸鱼')).resolves.toEqual(emptyPage);
  await port.search('摸鱼', 1, signal());
  expect(network.search).toHaveBeenCalledOnce();
  await port.remove('1', signal());
  await port.list(1, signal());
  expect(network.list).toHaveBeenCalledTimes(7);
});

it('drops account data and cancels old reads and mutations on a session change', async () => {
  const { port, network, setOwner } = setup();
  await port.list(1, signal());
  let finishRead!: (data: typeof pageData) => void;
  let finishWrite!: () => void;
  network.search.mockImplementationOnce(() => new Promise((resolve) => (finishRead = resolve)));
  network.remove.mockImplementationOnce(() => new Promise((resolve) => (finishWrite = resolve)));
  const search = port.search('摸鱼', 1, signal());
  const write = port.remove('1', signal());
  setOwner('owner-b');
  expect(network.search.mock.calls[0]?.[2].aborted).toBe(true);
  expect(network.remove.mock.calls[0]?.[1].aborted).toBe(true);
  await expect(search).rejects.toMatchObject({ name: 'AbortError' });
  network.list.mockResolvedValue(emptyPage);
  await expect(port.list(1, signal())).resolves.toEqual(emptyPage);
  finishRead(pageData);
  finishWrite();
  await expect(write).rejects.toMatchObject({ name: 'AbortError' });
  await port.list(1, signal());
  expect(network.list).toHaveBeenCalledTimes(2);
  await port.search('摸鱼', 1, signal());
  expect(network.search).toHaveBeenCalledTimes(2);
  setOwner('');
  await expect(port.list(1, signal())).rejects.toThrow('请登录后使用表情包');
  setOwner('owner-b');
  await port.list(1, signal());
  expect(network.list).toHaveBeenCalledTimes(3);
});
