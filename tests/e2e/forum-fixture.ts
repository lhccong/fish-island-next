import { type Page } from '@playwright/test';
export async function forumFixture(page: Page, skin: string, mode: string, role = 'admin') {
  await page.addInitScript(
    ({ skin, mode, role }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
      if (role !== 'guest')
        sessionStorage.setItem(
          'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn',
          JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic-value' }),
        );
    },
    { skin, mode, role },
  );
  await page.routeWebSocket(/\/ws\//, (socket) => {
    socket.onMessage(() => {});
  });
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/get/login', (route) =>
    route.fulfill({
      json: { code: 0, data: { id: '17', userName: '论坛测试岛友', userRole: role } },
    }),
  );
  const state = {
    status: 'ready',
    moreFail: false,
    saveFail: false,
    reads: 0,
    writes: 0,
    query: {} as Record<string, unknown>,
    reply: {} as Record<string, unknown>,
  };
  const post = (i: number) => ({
    id: String(i),
    userId: '17',
    user: { id: '17', userName: '论坛测试岛友' },
    title: `岛上的第 ${i} 个话题`,
    content:
      '# 周末去哪里\n\n**来聊聊你的计划**\n\n[安全链接](https://example.com)\n\n<script>window.forumUnsafe=true</script><img src="javascript:alert(1)" onerror="window.forumUnsafe=true">\n\n```js\nconst island = true;\n```',
    summary: '这是一条用于验证论坛布局和真实交互的合成内容。',
    tagList: ['闲聊'],
    thumbNum: 3,
    favourNum: 2,
    commentNum: 1,
    viewNum: 20,
    createTime: '2026-11-15 12:00:00',
  });
  await page.route('**/api/post/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/list/page/vo')) {
      state.reads++;
      const body = route.request().postDataJSON();
      state.query = body;
      if (state.status === 'loading') await new Promise((resolve) => setTimeout(resolve, 500));
      if (state.status === 'error' || (body.current > 1 && state.moreFail))
        return route.fulfill({ json: { code: 50000, message: '帖子读取失败，请重试' } });
      return route.fulfill({
        json: {
          code: 0,
          data: {
            total: state.status === 'empty' ? '0' : '11',
            records:
              state.status === 'empty'
                ? []
                : body.current === 1
                  ? Array.from({ length: 10 }, (_, i) => post(i + 1))
                  : [post(10), post(11)],
          },
        },
      });
    }
    if (url.pathname.endsWith('/get/vo'))
      return route.fulfill({
        json: { code: 0, data: post(Number(url.searchParams.get('id')) || 1) },
      });
    state.writes++;
    return route.fulfill({
      json: state.saveFail
        ? { code: 50000, message: '保存失败，请重试' }
        : {
            code: 0,
            data: url.pathname.endsWith('/add')
              ? '12'
              : url.pathname.includes('/reward/') || url.pathname.includes('/random/')
                ? { userName: '中奖岛友', rewardToken: 'synthetic-prize' }
                : true,
          },
    });
  });
  await page.route('**/api/tags/list/page/vo', (route) =>
    route.fulfill({
      json: { code: 0, data: { total: '1', records: [{ id: '1', tagsName: '闲聊' }] } },
    }),
  );
  await page.route('**/api/post_thumb/do', (route) =>
    route.fulfill({ json: { code: 0, data: 1 } }),
  );
  await page.route('**/api/post_favour/', (route) => route.fulfill({ json: { code: 0, data: 1 } }));
  const comment = (id: string) => ({
    id,
    userId: '17',
    user: { userName: '评论岛友' },
    content: '这是一条评论',
    childCount: id === '100' ? 1 : 0,
  });
  await page.route('**/api/comment/**', (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes('/list/'))
      return route.fulfill({
        json: {
          code: 0,
          data: { total: '1', records: [comment(path.endsWith('/children') ? '101' : '100')] },
        },
      });
    state.reply = route.request().postDataJSON();
    return route.fulfill({ json: { code: 0, data: path.endsWith('/add') ? '102' : true } });
  });
  await page.route('**/api/comment_thumb/', (route) =>
    route.fulfill({ json: { code: 0, data: 1 } }),
  );
  await page.route('**/api/file/minio/upload', (route) =>
    route.fulfill({ json: { code: 0, data: 'https://forum.test/upload.png' } }),
  );
  return state;
}
