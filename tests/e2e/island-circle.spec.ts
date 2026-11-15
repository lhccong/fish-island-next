import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(120_000);
const longText =
  '合成海岛日记\n' +
  Array.from({ length: 12 }, (_, i) => `${i + 1}. 今天也在海岛记录一件小事，看看海风与落日。`).join(
    '\n',
  );
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: island circle defaults, long text, social actions and state`, async ({
      page,
    }, info) => {
      let phase: 'loading' | 'error' | 'empty' | 'success' = 'loading';
      let release: (() => void) | undefined;
      let listRequests = 0,
        commentRequests = 0,
        likes = 12,
        liked = false,
        published = '',
        comment = '';
      const fixture = await setupChatMenu(page, skin.id, mode, 'user', async () => {
        await page.route('https://island.test/*.svg', (route) =>
          route.fulfill({
            contentType: 'image/svg+xml',
            body: route.request().url().includes('avatar')
              ? '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#ead9b8"/><path d="M12 18h12l8 10h16l8-10h12v44H12z" fill="#fff7e6"/><path d="M25 38h6v8h-6zm24 0h6v8h-6zm-14 16h10v4H35z" fill="#305b54"/></svg>'
              : '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="260"><rect width="600" height="260" fill="#bfe2ef"/><path d="M0 80h600v180H0z" fill="#56becb"/><path d="M0 180q120-40 260 0t340-10v90H0z" fill="#a5e2df"/><path d="M0 220q200-50 600 0v40H0z" fill="#f8e8bf"/><path d="M400 70l90-50 110 60z" fill="#49876e"/></svg>',
          }),
        );
        await page.route('**/api/moments/**', async (route) => {
          const path = new URL(route.request().url()).pathname.split('/api/moments/')[1];
          const body = route.request().postDataJSON() as Record<string, unknown>;
          if (path === 'list') {
            listRequests++;
            if (phase === 'loading')
              await new Promise<void>((resolve) => {
                release = resolve;
              });
            if (phase === 'error')
              return route.fulfill({ status: 503, body: 'synthetic circle error' });
            const moment = (id: string, name: string, content: string, images: number) => ({
              id,
              userId: '456',
              userName: name,
              userAvatar: 'https://island.test/avatar.svg',
              content,
              createTime: '2026-11-15 14:00:00',
              mediaJson: Array.from({ length: images }, (_, i) => ({
                type: 'image',
                url: `https://island.test/sea-${id}-${i}.svg`,
              })),
              likeNum: id === '101' ? likes : 6,
              liked: id === '101' ? liked : false,
              likeUserNames: '合成阿鱼,合成小满',
              commentNum: id === '101' ? (comment ? 2 : 1) : 0,
              isTop: 0,
            });
            const first = moment('101', '合成海风来信', longText, 1);
            const records =
              Number(body.current) > 1
                ? [first, moment('104', '合成第四位岛民', '第二页的合成动态', 0)]
                : [
                    first,
                    moment('102', '合成小岛居民', published || '忙完啦，给自己留十分钟摸鱼。', 0),
                    moment('103', '合成椰子同学', '分享今天收获的小快乐。', 2),
                  ];
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  records: phase === 'empty' ? [] : records,
                  total: phase === 'empty' ? 0 : 4,
                },
              },
            });
          }
          if (path === 'publish') {
            published = String(body.content);
            phase = 'success';
            return route.fulfill({ json: { code: 0, data: '105' } });
          }
          if (path === 'like') {
            liked = !liked;
            likes += liked ? 1 : -1;
            return route.fulfill({ json: { code: 0, data: liked } });
          }
          if (path === 'comment/add') {
            comment = String(body.content);
            return route.fulfill({ json: { code: 0, data: '301' } });
          }
          if (path === 'comment/list') {
            commentRequests++;
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  records: [
                    {
                      id: '300',
                      userId: '456',
                      userName: '合成岛友',
                      content: '海风正好',
                      children: [],
                    },
                    ...(comment
                      ? [
                          {
                            id: '301',
                            userId: '123',
                            userName: '本人合成',
                            content: comment,
                            children: [],
                          },
                        ]
                      : []),
                  ],
                  total: comment ? 2 : 1,
                },
              },
            });
          }
          return route.fulfill({ json: { code: 0, data: true } });
        });
      });
      const initialChat = fixture.stats();
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await draft.fill('合成聊天草稿与鱼小圈隔离');
      await page.getByRole('button', { name: '打开我的小岛', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '我的小岛', exact: true });
      const panel = dialog.getByRole('region', { name: '我的海岛', exact: true });
      expect(await panel.getByRole('tab').allTextContents()).toEqual(['鱼小圈', '手账']);
      await expect(panel.getByRole('tab', { name: '鱼小圈', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      const feed = panel.getByRole('region', { name: '海岛鱼小圈', exact: true });
      await expect(feed.getByRole('status').filter({ hasText: '正在加载动态' })).toBeVisible();
      await expect.poll(() => !!release).toBe(true);
      phase = 'error';
      release!();
      await expect(feed.getByRole('alert')).toBeVisible();
      phase = 'empty';
      await feed.getByRole('button', { name: '重试动态', exact: true }).click();
      await expect(feed.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
      await feed.getByRole('button', { name: '发动态', exact: true }).click();
      const editor = page.getByRole('dialog', { name: '发布朋友圈', exact: true });
      await editor.getByRole('textbox', { name: '动态内容', exact: true }).fill('合成侧栏发布正文');
      await editor.getByRole('button', { name: '发布', exact: true }).click();
      await expect(editor).toHaveCount(0);
      const post = feed.getByRole('article', { name: '合成海风来信的动态', exact: true });
      await expect(post).toBeVisible();
      await expect(post).toHaveCSS('border-top-width', '3px');
      const expand = post.getByRole('button', { name: '展开动态全文', exact: true });
      await expect(expand).toBeVisible();
      const paragraph = post.locator('p[data-collapsed]');
      const collapsedHeight = (await paragraph.boundingBox())!.height;
      const paragraphBounds = (await paragraph.boundingBox())!;
      const expandBounds = (await expand.boundingBox())!;
      expect(expandBounds.y).toBeLessThan(paragraphBounds.y + paragraphBounds.height);
      expect(expandBounds.x).toBeGreaterThanOrEqual(paragraphBounds.x + paragraphBounds.width - 1);
      await expand.click();
      await expect(post.getByRole('button', { name: '收起动态全文', exact: true })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      expect((await paragraph.boundingBox())!.height).toBeGreaterThan(collapsedHeight * 2);
      await post.getByRole('button', { name: '收起动态全文', exact: true }).click();
      await post.getByRole('button', { name: '点赞 12', exact: true }).click();
      await expect(post.getByRole('button', { name: '取消点赞 13', exact: true })).toBeVisible();
      const likeLine = post.locator('p').filter({ hasText: '合成阿鱼' });
      await expect(likeLine).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
      expect(commentRequests).toBe(0);
      await post.getByRole('button', { name: '评论 1', exact: true }).click();
      await post.getByRole('textbox', { name: '评论内容', exact: true }).fill('合成评论草稿');
      const requestsBeforeTabs = listRequests;
      await panel.getByRole('tab', { name: '手账', exact: true }).click();
      await panel.getByRole('textbox', { name: '随手记', exact: true }).fill('合成手账草稿');
      await panel.getByRole('tab', { name: '鱼小圈', exact: true }).click();
      await expect(post.getByRole('textbox', { name: '评论内容', exact: true })).toHaveValue(
        '合成评论草稿',
      );
      expect(listRequests).toBe(requestsBeforeTabs);
      await post.getByRole('button', { name: '发送评论', exact: true }).click();
      await expect(post.getByText('合成评论草稿', { exact: true })).toBeVisible();
      await expect(post.getByRole('button', { name: '评论 2', exact: true })).toBeVisible();
      await post.getByRole('button', { name: '评论 2', exact: true }).click();
      await post.getByRole('button', { name: '更多动态操作', exact: true }).click();
      await expect(page.getByRole('menuitem', { name: '打赏', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await post.getByRole('button', { name: '查看图片 1', exact: true }).click();
      await expect(page.getByRole('dialog', { name: '图片预览', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      const scroll = panel.getByRole('region', { name: '海岛动态滚动区', exact: true });
      await scroll.focus();
      await scroll.press('End');
      await expect(
        feed.getByRole('article', { name: '合成第四位岛民的动态', exact: true }),
      ).toBeAttached();
      await expect(feed.getByRole('article')).toHaveCount(4);
      await scroll.focus();
      await scroll.press('Home');
      const beforeMode = listRequests;
      await dialog.getByRole('button', { name: '关闭我的小岛', exact: true }).click();
      await expect(draft).toHaveText('合成聊天草稿与鱼小圈隔离');
      await page.getByRole('button', { name: '切换主题', exact: true }).click();
      const theme = page.getByRole('dialog', { name: '主题模式', exact: true });
      await theme
        .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
        .click();
      await theme
        .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
        .click();
      await theme.getByRole('button', { name: '关闭', exact: true }).click();
      await page.getByRole('button', { name: '打开我的小岛', exact: true }).click();
      await expect(panel.getByRole('tab', { name: '鱼小圈', exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(feed.getByRole('button', { name: '取消点赞 13', exact: true })).toBeVisible();
      expect(listRequests).toBe(beforeMode);
      expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(await scroll.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath('island-circle.png'), scale: 'css' });
      await dialog.getByRole('button', { name: '关闭我的小岛', exact: true }).click();
      expect(fixture.stats().connections).toBe(initialChat.connections);
      expect(fixture.stats().historyRequests).toBe(initialChat.historyRequests);
      if (skin.id === 'pixel-island' && page.viewportSize()!.width > 760)
        await page.screenshot({ path: info.outputPath('island-circle-desktop.png'), scale: 'css' });
    });
  }
