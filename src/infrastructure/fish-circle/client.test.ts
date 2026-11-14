import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFishCircleClient } from './index';
import { moment, page, comment } from './decode';
const signal = () => new AbortController().signal;
const token = () => ({ name: 'test-session', value: 'synthetic-value' });
afterEach(() => vi.unstubAllGlobals());
function respond(data: unknown, code = 0) {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify({ code, data }), { status: 200 }));
  vi.stubGlobal('fetch', fetcher);
  return fetcher;
}
describe('fish circle compatibility', () => {
  it('validates identities and strips unsafe media URLs', () => {
    expect(() => moment({ id: 1 })).toThrow();
    const decoded = moment({
      id: '9007199254740993',
      userId: '2',
      mediaJson: [
        { type: 'image', url: 'javascript:alert(1)' },
        { type: 'video', url: 'https://example.com/video.mp4' },
      ],
    });
    expect(decoded.id).toBe('9007199254740993');
    expect(decoded.media).toHaveLength(1);
    expect(() => page({ records: [], total: -1 }, moment)).toThrow();
    expect(page({ records: [], total: '10' }, moment).total).toBe(10);
    expect(() => page({ records: [], total: 'bad' }, moment)).toThrow();
    expect(() => page({ records: [], total: '9007199254740993' }, moment)).toThrow();
  });
  it('decodes a full comment page without treating record indices as reply depth', async () => {
    respond({
      total: '15',
      records: Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        userId: '123',
        content: `comment ${i + 1}`,
        children: [{ id: String(100 + i), userId: '456', content: 'reply' }],
      })),
    });
    const result = await createFishCircleClient('', token, vi.fn()).comments('1', 1, signal());
    expect(result.items).toHaveLength(10);
    expect(result.items[9]?.children[0]?.content).toBe('reply');
    expect(result.total).toBe(15);
  });
  it('keeps the guard for actual excessive reply nesting', () => {
    let nested: unknown = { id: '100', userId: '123' };
    for (let i = 0; i < 10; i++) nested = { id: String(i), userId: '123', children: [nested] };
    expect(() => comment(nested)).toThrow('评论层级异常');
  });
  it('decodes legacy image comments without executing HTML', () => {
    const decoded = comment({
      id: '1',
      userId: '2',
      content: 'hello[img:https://example.com/a.png]<script>alert(1)</script>[img:javascript:bad]',
    });
    expect(decoded.media).toEqual([{ type: 'image', url: 'https://example.com/a.png' }]);
    expect(decoded.content).toBe('hello<script>alert(1)</script>[img:javascript:bad]');
  });
  it('encodes image replies and preserves the parent identity', async () => {
    const fetcher = respond('3');
    const client = createFishCircleClient('', token, vi.fn());
    await client.comment(
      '1',
      'reply',
      comment({ id: '2', userId: '4' }),
      [{ type: 'image', url: 'https://example.com/a.png' }],
      signal(),
    );
    const options = (fetcher.mock.calls[0] as [string, RequestInit])[1];
    expect(JSON.parse(String(options.body))).toEqual({
      momentId: '1',
      content: 'reply[img:https://example.com/a.png]',
      parentId: '2',
      replyUserId: '4',
    });
  });
  it('reads legacy profile covers and rejects unsafe URLs', async () => {
    const fetcher = respond({
      userName: '合成岛友',
      userAvatar: 'javascript:bad',
      momentsBgUrl: 'https://example.com/cover.png',
    });
    const profile = await createFishCircleClient('https://example.com', token, vi.fn()).profile(
      '123',
      signal(),
    );
    expect(profile).toEqual({
      name: '合成岛友',
      avatar: '',
      cover: 'https://example.com/cover.png',
    });
    expect(fetcher.mock.calls[0]?.[0]).toBe('https://example.com/api/user/get/vo?id=123');
  });
  it('sends the current token and preserves pagination/filter', async () => {
    const fetcher = respond({ records: [], total: 0 });
    await createFishCircleClient('https://example.com/', token, vi.fn()).list(2, '123', signal());
    const [url, options] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/api/moments/list');
    expect(new Headers(options.headers).get('test-session')).toBe('synthetic-value');
    expect(JSON.parse(String(options.body))).toEqual({ current: 2, pageSize: 10, userId: '123' });
  });
  it('accepts false as a successful unlike and rejects unconfirmed deletes', async () => {
    respond(false);
    const client = createFishCircleClient('', token, vi.fn());
    await expect(client.like('1', signal())).resolves.toBe(false);
    await expect(client.action('delete', '1', 1, signal())).rejects.toThrow('服务器未确认');
  });
  it('does not overwrite original visibility on edit', async () => {
    const fetcher = respond(true);
    const client = createFishCircleClient('', token, vi.fn());
    await client.save(
      { content: 'edited', location: '', media: [] },
      moment({ id: '1', userId: '2', visibility: 2 }),
      signal(),
    );
    const body = JSON.parse(
      String((fetcher.mock.calls[0] as [string, RequestInit])[1].body),
    ) as object;
    expect(body).not.toHaveProperty('visibility');
    expect(body).not.toHaveProperty('allowList');
  });
  it('notifies the app on expiry and rejects malformed responses', async () => {
    const expired = vi.fn();
    const client = createFishCircleClient('', token, expired);
    respond(null, 40100);
    await expect(client.list(1, '', signal())).rejects.toThrow('登录已过期');
    expect(expired).toHaveBeenCalledOnce();
    respond({ records: 'bad', total: 1 });
    await expect(client.list(1, '', signal())).rejects.toThrow('分页');
  });
  it('cancels requests and validates upload before network access', async () => {
    const fetcher = vi.fn().mockImplementation(
      (_url: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    vi.stubGlobal('fetch', fetcher);
    const client = createFishCircleClient('', token, vi.fn());
    const controller = new AbortController();
    const pending = client.list(1, '', controller.signal);
    controller.abort();
    await expect(pending).rejects.toHaveProperty('name', 'AbortError');
    await expect(
      client.upload(new File(['x'], 'bad.svg', { type: 'image/svg+xml' }), signal()),
    ).rejects.toThrow('请选择');
    expect(fetcher).toHaveBeenCalledOnce();
  });
});

describe('legacy interaction reminders', () => {
  it('maps reminders, validates state and preserves source IDs', async () => {
    const fetcher = respond({
      total: '11',
      records: [
        {
          id: '9007199254740993',
          state: 0,
          action: 'like',
          sourceType: 4,
          sourceId: '42',
          senderId: '9007199254740994',
          sourceContent: '[img]https://example.com/a.png[/img]',
          senderUser: { userName: '合成通知' },
          createTime: '2026-11-12',
        },
      ],
    });
    const result = await createFishCircleClient('', token, vi.fn()).reminders(2, signal());
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({
      current: 2,
      pageSize: 10,
      sortField: 'createTime',
      sortOrder: 'descend',
    });
    expect(result.items[0]).toMatchObject({
      id: '9007199254740993',
      momentId: '42',
      senderId: '9007199254740994',
      read: false,
      image: 'https://example.com/a.png',
      content: '',
    });
    respond({ total: 1, records: [{ id: 1, state: 9 }] });
    await expect(createFishCircleClient('', token, vi.fn()).reminders(1, signal())).rejects.toThrow(
      '通知已读状态异常',
    );
  });
  it('uses legacy batch routes and rejects unconfirmed mutations', async () => {
    const fetcher = respond(true);
    const client = createFishCircleClient('', token, vi.fn());
    await client.reminderAction('read', ['12'], signal());
    expect(fetcher.mock.calls[0]![0]).toBe('/api/event_remind/batch/read');
    expect(JSON.parse(fetcher.mock.calls[0]![1].body)).toEqual({ ids: ['12'] });
    await client.reminderAction('delete', ['12'], signal());
    expect(fetcher.mock.calls[1]![0]).toBe('/api/event_remind/batch/delete');
    respond(false);
    await expect(client.reminderAction('read', ['12'], signal())).rejects.toThrow('服务器未确认');
  });
  it('reads full unread counts and separates global mutations from selected IDs', async () => {
    const fetcher = respond('105');
    const client = createFishCircleClient('', token, vi.fn());
    expect(await client.unreadReminderCount(signal())).toBe(105);
    expect(fetcher.mock.calls[0]![0]).toBe('/api/event_remind/my/unread/count');
    expect(fetcher.mock.calls[0]![1].method).toBe('GET');
    for (const bad of [true, null, '', '-1', '1.5', -1, 1.5, '9007199254740993']) {
      respond(bad);
      await expect(client.unreadReminderCount(signal())).rejects.toThrow('数量异常');
    }
    const mutations = respond(true);
    await client.allReminderAction('read', signal());
    await client.allReminderAction('delete', signal());
    expect(mutations.mock.calls.map((call) => call[0])).toEqual([
      '/api/event_remind/batch/set/read',
      '/api/event_remind/all/delete',
    ]);
    expect(JSON.parse(mutations.mock.calls[1]![1].body)).toEqual({});
    respond(false);
    await expect(client.allReminderAction('delete', signal())).rejects.toThrow('服务器未确认');
  });
});
