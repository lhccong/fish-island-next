import { expect, type Page } from '@playwright/test';
const owner = { id: '123', userName: '合成岛友', userAvatar: null, userRole: 'admin' };
export const post = {
  id: '1001',
  userId: '123',
  userName: '合成岛友',
  content: '今天在岛上看海',
  createTime: '2026-11-11 10:00',
  mediaJson: [],
  likeNum: 0,
  liked: false,
  commentNum: 0,
  isTop: 0,
};
export async function setup(
  page: Page,
  other = false,
  options: {
    visual?: boolean;
    profileFailure?: boolean;
    brokenCover?: boolean;
    commentTotal?: number;
    paginate?: boolean;
  } = {},
) {
  const state = {
    commentTotal: options.commentTotal ?? (options.visual ? 5 : 0),
    commentFailure: false,
    replyParent: '',
    replyUser: '',
    visual: options.visual ?? false,
    profileFailure: options.profileFailure ?? false,
    brokenCover: options.brokenCover ?? false,
    top: options.visual ?? false,
    empty: false,
    fail: false,
    delay: 0,
    expired: false,
    liked: false,
    removed: false,
    published: false,
    text: options.visual
      ? '周末的小岛生活：吹吹海风，看看落日。今天整理了几张旅途中的照片，留给下一次忙里偷闲的自己。你最近有什么想分享的小事？'
      : post.content,
    comment: '',
    page: 1,
    filter: '',
    mutationFailure: false,
    actions: [] as string[],
    following: false,
    media: (options.visual ? [{ type: 'image', url: 'https://circle.test/post.svg' }] : []) as {
      type: string;
      url: string;
    }[],
  };
  await page.route('**/api/**', (r) => r.abort());
  await page.route('**/api/hot/list', (r) => r.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/**', (r) => {
    if (r.request().url().includes('/get/vo?') && state.profileFailure)
      return r.fulfill({ status: 503, json: {} });
    return r.fulfill({
      json: {
        code: state.expired ? 40100 : 0,
        data: {
          ...owner,
          userAvatar: state.visual ? 'https://circle.test/avatar.svg' : null,
          momentsBgUrl: state.brokenCover
            ? 'https://circle.test/broken.svg'
            : state.visual
              ? 'https://circle.test/cover.svg'
              : '',
          saTokenInfo: { tokenName: 'test-session', tokenValue: 'synthetic-value' },
        },
      },
    });
  });
  await page.route('https://circle.test/*.svg', (r) => {
    if (r.request().url().endsWith('/broken.svg')) return r.fulfill({ status: 404, body: '' });
    const avatar = r.request().url().endsWith('/avatar.svg');
    return r.fulfill({
      contentType: 'image/svg+xml',
      body: avatar
        ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#f5dbc4"/><circle cx="40" cy="42" r="24" fill="#fffaf2"/><circle cx="32" cy="38" r="3" fill="#576b95"/><circle cx="48" cy="38" r="3" fill="#576b95"/><path d="M30 49Q40 58 50 49" fill="none" stroke="#576b95" stroke-width="3"/></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 400"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#c9dfdf"/><stop offset="1" stop-color="#edf2e5"/></linearGradient></defs><rect width="1100" height="400" fill="url(#sky)"/><circle cx="805" cy="90" r="48" fill="#f9e6b2"/><path d="M0 240Q200 160 400 240T800 220T1200 200V400H0Z" fill="#99beb5"/><path d="M0 310Q240 220 460 300T900 280T1200 300V400H0Z" fill="#648f88"/><path d="M0 360Q250 300 500 350T1100 330V400H0Z" fill="#416d66"/></svg>',
    });
  });
  await page.route('**/api/follow/**', (r) => {
    if (r.request().url().includes('/toggle?')) state.following = !state.following;
    return r.fulfill({ json: { code: 0, data: state.following } });
  });
  await page.route('https://circle.test/image.png', (r) =>
    r.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afo0AAAAASUVORK5CYII=',
        'base64',
      ),
    }),
  );
  await page.route('**/api/file/minio/upload?biz=user_post', (r) =>
    r.fulfill({ json: { code: 0, data: 'https://circle.test/image.png' } }),
  );
  await page.route('**/api/moments/**', async (r) => {
    const path = new URL(r.request().url()).pathname.split('/api/moments/')[1]!;
    const body = r.request().postDataJSON() as Record<string, unknown>;
    expect(r.request().headers()['test-session']).toBe('synthetic-value');
    if (state.delay) await new Promise((resolve) => setTimeout(resolve, state.delay));
    if (state.expired) return r.fulfill({ json: { code: 40100, message: '登录过期' } });
    if (path === 'list') {
      state.page = Number(body.current);
      state.filter = String(body.userId || '');
      if (state.fail) return r.fulfill({ status: 503, json: {} });
      return r.fulfill({
        json: {
          code: 0,
          data: {
            records:
              state.empty || state.removed
                ? []
                : [
                    {
                      ...post,
                      userId: other ? '456' : post.userId,
                      mediaJson: state.media,
                      userAvatar: state.visual ? 'https://circle.test/avatar.svg' : null,
                      isTop: state.top ? 1 : 0,
                      location: state.visual ? '摸鱼小岛' : '',
                      likeUserNames: state.visual ? '清风,海盐,小岛' : '',
                      commentNum: state.commentTotal,
                      id: state.page === 1 ? post.id : '1002',
                      content: state.page === 1 ? state.text : '第二页的动态',
                      liked: state.liked,
                      likeNum: state.liked ? 1 : 0,
                    },
                  ],
            total: state.empty || state.removed ? '0' : options.paginate ? '2' : '1',
          },
        },
      });
    }
    if (state.mutationFailure) return r.fulfill({ json: { code: 40000, message: '合成操作失败' } });
    state.actions.push(path);
    let data: unknown = true;
    if (path === 'like') {
      state.liked = !state.liked;
      data = state.liked;
    }
    if (path === 'publish') {
      state.published = true;
      data = '2001';
    }
    if (path === 'update') state.text = String(body.content);
    if (path === 'delete') state.removed = true;
    if (path === 'top') state.top = body.top === true;
    if (path === 'comment/add') {
      state.comment = String(body.content);
      state.replyParent = String(body.parentId || '');
      state.replyUser = String(body.replyUserId || '');
      data = '3001';
    }
    if (path === 'comment/delete') state.comment = '';
    if (path === 'comment/list' && state.commentFailure)
      return r.fulfill({ status: 503, json: {} });
    if (path === 'comment/list')
      data = {
        records: state.comment
          ? [
              {
                id: '3001',
                userId: '123',
                userName: '合成岛友',
                content: state.comment,
                children: [],
              },
            ]
          : state.commentTotal > 0
            ? Array.from(
                {
                  length: Math.max(
                    0,
                    Math.min(10, state.commentTotal - (Number(body.current) - 1) * 10),
                  ),
                },
                (_, index) => {
                  const i = (Number(body.current) - 1) * 10 + index;
                  return {
                    id: String(3000 + i),
                    userId: String(400 + i),
                    userName: ['清风', '海盐', '小岛', '晚霞', '小满'][i] || `合成岛友 ${i + 1}`,
                    userAvatar: 'https://circle.test/avatar.svg',
                    content:
                      [
                        '今天也要好好享受生活。',
                        '这里的风景真好，周末一起去看看。',
                        '给忙碌的一天留一点自己的时间。',
                        '第四条合成评论',
                        '第五条合成评论',
                      ][i] || `第 ${i + 1} 条合成评论`,
                    createTime: '2026-11-11T08:30:00Z',
                    children:
                      state.commentTotal > 10 && i === 9
                        ? [
                            {
                              id: '4009',
                              userId: '999',
                              userName: '子回复岛友',
                              content: '第10条的子回复',
                              children: [],
                            },
                          ]
                        : [],
                  };
                },
              )
            : [],
        total: state.comment ? '1' : String(state.commentTotal),
      };
    if (path === 'lottery/start') data = { winners: [{ userName: '合成中奖岛友' }] };
    return r.fulfill({ json: { code: 0, data } });
  });
  await page.goto('/user/login?redirect=%2Fmoments%2Ffish-circle');
  await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-account');
  await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
  await page.getByRole('button', { name: '登录', exact: true }).last().click();
  await expect(page).toHaveURL('/moments/fish-circle');
  return state;
}
export async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
