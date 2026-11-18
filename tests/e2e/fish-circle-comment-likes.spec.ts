import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { noOverflow, post, setup } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: comment likes re-rank comments and replies`, async ({
      page,
    }, info) => {
      test.setTimeout(60000);
      await page.addInitScript(
        ({ skinId, mode }) => {
          localStorage.setItem('fish-island:skin', skinId);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skinId: skin.id, mode },
      );
      await setup(page);
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      const mobile = page.viewportSize()!.width <= 760;
      const phase = { value: 'error' };
      let releaseList: (() => void) | undefined;
      let releaseLike: (() => void) | undefined;
      const liked = new Set<string>();
      const requests: Array<{ commentId: string; liked: boolean }> = [];
      const row = (id: string, likes = 0) => ({
        id,
        userId: '456',
        userName: `合成岛友 ${id}`,
        content: `合成评论 ${id}`,
        liked: liked.has(id),
        likeNum: likes + Number(liked.has(id)),
      });
      const ranked = (rows: ReturnType<typeof row>[]) =>
        rows.sort((a, b) => b.likeNum - a.likeNum || Number(b.id) - Number(a.id));

      await page.route('**/api/moments/comment/list', async (route) => {
        if (phase.value === 'error') {
          await new Promise<void>((resolve) => (releaseList = resolve));
          return route.fulfill({ status: 503 });
        }
        const records =
          phase.value === 'empty'
            ? []
            : [
                {
                  ...row('100', 0),
                  isTop: 1,
                  children: ranked([row('201'), row('202')]),
                },
                ...ranked([row('101'), row('102')]),
              ];
        return route.fulfill({ json: { code: 0, data: { records, total: records.length } } });
      });
      let failLike = true;
      await page.route('**/api/moments/comment/like', async (route) => {
        const body = route.request().postDataJSON() as (typeof requests)[number];
        requests.push(body);
        if (failLike) {
          await new Promise<void>((resolve) => (releaseLike = resolve));
          return route.fulfill({ json: { code: 40000, message: '点赞失败，请重试' } });
        }
        if (body.liked) liked.add(body.commentId);
        else liked.delete(body.commentId);
        return route.fulfill({ json: { code: 0, data: true } });
      });

      const open = page.getByRole('button', { name: '评论 0', exact: true });
      const comments = page.getByRole('region', { name: '评论区', exact: true });
      const list = comments.getByRole('region', { name: '评论列表', exact: true });
      const item = (id: string) => list.locator(`[data-comment-id="${id}"]`);
      const button = (id: string) => item(id).getByRole('button', { name: '点赞评论' }).first();
      async function activate(control: ReturnType<typeof button>) {
        if (mobile) await control.tap();
        else await control.click();
      }
      async function checkBounds() {
        await noOverflow(page);
        expect(await list.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      }
      const order = () =>
        list
          .locator('[data-comment-id]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-comment-id')));

      await activate(open);
      const form = comments.locator('form');
      await expect(form).toBeVisible();
      await expect(comments.getByText('正在加载评论…')).toBeVisible();
      expect((await form.boundingBox())!.y + (await form.boundingBox())!.height).toBeLessThan(
        (await list.boundingBox())!.y,
      );
      await checkBounds();

      await expect.poll(() => Boolean(releaseList)).toBe(true);
      releaseList?.();
      await expect(comments.getByRole('alert')).toContainText('503');
      await checkBounds();
      phase.value = 'empty';
      await activate(comments.getByRole('button', { name: '重试评论' }));
      await expect(comments.getByText('暂无评论，来聊两句吧')).toBeVisible();
      await checkBounds();
      phase.value = 'success';
      await page.reload();
      await activate(open);
      const editor = comments.getByRole('textbox', { name: '评论内容' });
      await editor.fill('点赞后保留评论草稿');
      await expect.poll(order).toEqual(['100', '102', '101']);
      const box = (await button('101').boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBe(mobile ? 44 : 32);
      if (mobile) await button('101').tap();
      else {
        await button('101').hover();
        await button('101').focus();
        await expect(button('101')).toBeFocused();
        await button('101').press('Space');
      }
      await expect(button('101')).toBeDisabled();
      await expect(comments.getByText('处理中…')).toBeVisible();
      await checkBounds();
      await expect.poll(() => Boolean(releaseLike)).toBe(true);
      releaseLike?.();
      await expect(comments.getByRole('alert')).toHaveText('点赞失败，请重试');
      await expect(button('101')).toHaveAttribute('aria-pressed', 'false');
      expect(requests).toHaveLength(1);

      failLike = false;
      await activate(button('101'));
      await expect(button('101')).toHaveAttribute('aria-pressed', 'true');
      await expect(button('101')).toHaveText('1');
      await expect.poll(order).toEqual(['100', '101', '102']);
      await checkBounds();
      if (skin.id === 'moyu-island') {
        await button('101').scrollIntoViewIfNeeded();
        await page.screenshot({ path: info.outputPath('comment-likes.png') });
      }
      await activate(button('101'));
      await expect(button('101')).toHaveAttribute('aria-pressed', 'false');
      await expect.poll(order).toEqual(['100', '102', '101']);
      await activate(item('100').getByRole('button', { name: '查看 2 条回复' }));
      await expect.poll(order).toEqual(['100', '202', '201', '102', '101']);
      await activate(button('201'));
      await expect(button('201')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(order).toEqual(['100', '201', '202', '102', '101']);
      await expect(editor).toHaveValue('点赞后保留评论草稿');
      expect(requests).toEqual([
        { commentId: '101', liked: true },
        { commentId: '101', liked: true },
        { commentId: '101', liked: false },
        { commentId: '201', liked: true },
      ]);
      await checkBounds();

      await page.route('**/api/event_remind/**', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: route.request().url().endsWith('/page')
              ? {
                  total: 1,
                  records: [
                    {
                      id: '800',
                      senderId: '456',
                      senderUser: { userName: '合成岛友 101' },
                      action: 'comment',
                      sourceContent: '合成评论 101',
                      sourceType: 4,
                      sourceId: post.id,
                      state: 1,
                    },
                  ],
                }
              : 0,
          },
        }),
      );
      await page.route('**/api/moments/detail?*', (route) =>
        route.fulfill({ json: { code: 0, data: { ...post, commentNum: 3 } } }),
      );
      await activate(page.getByRole('button', { name: '消息通知', exact: true }));
      await activate(
        page
          .getByRole('dialog', { name: '全部互动消息' })
          .getByRole('button')
          .filter({ hasText: '合成评论 101' }),
      );
      const detail = page.getByRole('region', { name: '动态详情', exact: true });
      await expect(detail.locator('[data-comment-target="true"]')).toHaveAttribute(
        'data-comment-id',
        '101',
      );
      await activate(button('101'));
      await expect(button('101')).toHaveAttribute('aria-pressed', 'true');
      await expect.poll(order).toEqual(['100', '101', '102']);
      await checkBounds();
    });

for (const skin of ['moyu-island', 'pixel-island'])
  for (const mode of ['light', 'dark'])
    test(`${skin} ${mode}: likes work in the desktop chat sidebar`, async ({ page }) => {
      test.skip(page.viewportSize()!.width <= 760, 'The sidebar is a desktop entry point');
      test.setTimeout(60000);
      let liked = false;
      const chat = await setupChatMenu(page, skin, mode, 'user', async () => {
        await page.route('**/api/moments/list', (route) =>
          route.fulfill({ json: { code: 0, data: { records: [post], total: 1 } } }),
        );
        await page.route('**/api/moments/comment/list', (route) =>
          route.fulfill({
            json: {
              code: 0,
              data: {
                total: 1,
                records: [
                  {
                    id: '300',
                    userId: '456',
                    userName: '合成岛友',
                    content: '侧栏评论',
                    liked,
                    likeNum: Number(liked),
                  },
                ],
              },
            },
          }),
        );
        await page.route('**/api/moments/comment/like', (route) => {
          const body = route.request().postDataJSON() as { commentId: string; liked: boolean };
          expect(body.commentId).toBe('300');
          liked = body.liked;
          return route.fulfill({ json: { code: 0, data: true } });
        });
      });
      const before = chat.stats();
      const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
      await draft.fill('聊天草稿仍在');
      const sidebar = page.getByRole('region', { name: '海岛鱼小圈', exact: true });
      await sidebar.getByRole('button', { name: '评论 0', exact: true }).click();
      const editor = sidebar.getByRole('textbox', { name: '评论内容' });
      const list = sidebar.getByRole('region', { name: '评论列表', exact: true });
      await expect(editor).toBeFocused();
      expect((await editor.boundingBox())!.y).toBeLessThan((await list.boundingBox())!.y);
      const like = sidebar.getByRole('button', { name: '点赞评论' });
      await like.click();
      await expect(like).toHaveAttribute('aria-pressed', 'true');
      await like.click();
      await expect(like).toHaveAttribute('aria-pressed', 'false');
      await expect(draft).toHaveText('聊天草稿仍在');
      expect(chat.stats()).toEqual(before);
      await noOverflow(page);
    });
