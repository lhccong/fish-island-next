import { afterEach, describe, expect, it, vi } from 'vitest';
import { createForumClient } from './index';
import { post, page, id, safeUrl } from './decode';

afterEach(() => vi.unstubAllGlobals());
describe('论坛旧协议边界', () => {
  it('保留 Long 字符串精度，拒绝已丢失精度的编号和恶意图片协议', () => {
    expect(id('90071992547409930')).toBe('90071992547409930');
    expect(() => id(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(page({ records: [], total: '0' }, post)).toEqual({ items: [], total: 0 });
    expect(() => page({ records: [], total: -1 }, post)).toThrow();
  });
  it('映射排序、标签、私有收藏路径并透传取消信号', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ code: 0, data: { total: '0', records: [] } })),
      );
    vi.stubGlobal('fetch', fetchMock);
    const client = createForumClient(
      'https://forum.test/',
      () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
      vi.fn(),
    );
    await client.list(
      { tab: 'saved', search: '周末', tag: '闲聊' },
      2,
      new AbortController().signal,
    );
    expect(fetchMock.mock.calls[0]![0]).toBe('https://forum.test/api/post/my/favour/list/page/vo');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toMatchObject({
      current: 2,
      tags: ['闲聊'],
      searchText: '周末',
      sortField: 'createTime',
    });
    expect(fetchMock.mock.calls[0]![1].headers.get('synthetic-session')).toBe('synthetic-value');
    expect(fetchMock.mock.calls[0]![1].signal).toBeInstanceOf(AbortSignal);
  });
  it('只接受服务端确认的写入结果，回复保持直接父级与根级编号', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ code: 0, data: false })));
    vi.stubGlobal('fetch', fetchMock);
    const client = createForumClient(
      '',
      () => ({ name: 'synthetic-session', value: 'synthetic-value' }),
      vi.fn(),
    );
    await expect(client.remove('1', new AbortController().signal)).rejects.toThrow('未确认');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: 0, data: '90071992547409930' })),
    );
    await client.reply('1', '回复', '11', '10', new AbortController().signal);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({
      postId: '1',
      content: '回复',
      parentId: '11',
      rootId: '10',
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: 0, data: 0 })));
    await expect(client.react('1', 'like', new AbortController().signal)).rejects.toThrow('未确认');
  });
  it('游客可以阅读，不能提交；过期凭证交由应用恢复', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 40100 })));
    vi.stubGlobal('fetch', fetchMock);
    const expired = vi.fn();
    const guest = createForumClient('', () => null, expired);
    await expect(guest.remove('1', new AbortController().signal)).rejects.toThrow('请先登录');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(guest.detail('1', new AbortController().signal)).rejects.toThrow('登录已过期');
    expect(expired).toHaveBeenCalledOnce();
  });
});
