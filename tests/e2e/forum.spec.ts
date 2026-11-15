import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { forumFixture } from './forum-fixture';
import { assertArea } from './sign-in-layout';

for (const width of [1280, 375, 390])
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    for (const skin of builtinSkins)
      for (const mode of ['light', 'dark']) {
        test(`${skin.id} ${mode} 论坛完整流程`, async ({ page }, info) => {
          const state = await forumFixture(page, skin.id, mode);
          const errors: string[] = [];
          page.on('pageerror', (error) => errors.push(error.message));
          state.status = 'loading';
          await page.goto('/post');
          await expect(page.getByText('正在加载帖子…'), errors.join('\n')).toBeVisible();
          state.status = 'ready';
          const scroll = page.getByRole('region', { name: '论坛帖子', exact: true });
          await expect(
            page.getByRole('heading', { name: '岛上的第 1 个话题', exact: true }),
          ).toBeVisible();
          await assertArea(scroll, width < 760);
          const more = page.getByRole('button', {
            name: '更多操作：岛上的第 1 个话题',
            exact: true,
          });
          await more.click();
          await expect(page.getByRole('menuitem', { name: '编辑', exact: true })).toBeVisible();
          await expect(page.getByRole('menuitem', { name: '删除', exact: true })).toBeVisible();
          await page.getByRole('menuitem', { name: '设为精华', exact: true }).click();
          await expect(scroll.getByText('精华', { exact: true })).toBeVisible();
          await more.click();
          await page.getByRole('menuitem', { name: '取消精华', exact: true }).click();
          await more.click();
          await page.keyboard.press('Escape');
          await expect(more).toBeFocused();
          await more.click();
          await page.getByRole('menuitem', { name: '删除', exact: true }).click();
          await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
          await expect(more).toBeFocused();
          if (skin.id === 'pixel-island') {
            await more.click();
            await page.screenshot({ path: info.outputPath('forum-menu.png') });
            await page.keyboard.press('Escape');
          }
          await page.getByRole('tab', { name: '热门讨论' }).click();
          await expect.poll(() => state.query.sortField).toBe('thumbNum');
          await page.getByRole('button', { name: '闲聊', exact: true }).click();
          await expect.poll(() => state.query.tags).toEqual(['闲聊']);
          await expect(page.getByText('正在加载帖子…')).toHaveCount(0);
          await expect(
            scroll.getByRole('heading', { name: '岛上的第 1 个话题', exact: true }),
          ).toBeVisible();
          state.moreFail = true;
          await scroll.locator('[data-scroll-pagination="帖子"]').scrollIntoViewIfNeeded();
          await expect(page.getByRole('button', { name: '重试帖子' })).toBeVisible();
          state.moreFail = false;
          await page.getByRole('button', { name: '重试帖子' }).click();
          await expect(
            page.getByRole('heading', { name: '岛上的第 11 个话题', exact: true }),
          ).toBeVisible();
          await expect(
            page.getByRole('heading', { name: '岛上的第 10 个话题', exact: true }),
          ).toHaveCount(1);
          await page.getByRole('heading', { name: '岛上的第 11 个话题', exact: true }).click();
          await expect(page.getByRole('heading', { name: '周末去哪里' })).toBeVisible();
          expect(await page.evaluate(() => 'forumUnsafe' in window)).toBe(false);
          await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
          await page.getByRole('button', { name: '点赞 3', exact: true }).click();
          await expect(page.getByRole('button', { name: '已赞 4', exact: true })).toBeVisible();
          await page.getByRole('button', { name: '收藏 2', exact: true }).click();
          await expect(page.getByRole('button', { name: '已收藏 3', exact: true })).toBeVisible();
          await page.getByRole('button', { name: '回复', exact: true }).first().click();
          const dialog = page.getByRole('dialog');
          await dialog.getByRole('textbox', { name: '回复内容' }).fill('回复测试');
          await assertArea(dialog.getByRole('region', { name: '回复正文' }), width < 760);
          await dialog.getByRole('button', { name: '发送回复' }).click();
          await expect(dialog).toHaveCount(0);
          expect(state.reply).toMatchObject({
            postId: '11',
            parentId: '100',
            rootId: '100',
            content: '回复测试',
          });
          await page.getByRole('button', { name: '查看回复 1' }).click();
          await expect(page.getByRole('region', { name: '评论回复' })).toContainText(
            '这是一条评论',
          );
          await page.getByRole('button', { name: '编辑帖子', exact: true }).click();
          await page.getByRole('textbox', { name: '标题', exact: true }).fill('修改后的话题');
          state.saveFail = true;
          await page.getByRole('button', { name: '保存修改', exact: true }).click();
          await expect(page.getByRole('alert')).toContainText('保存失败');
          await expect(page.getByRole('textbox', { name: '标题', exact: true })).toHaveValue(
            '修改后的话题',
          );
          state.saveFail = false;
          await page.getByRole('button', { name: '保存修改', exact: true }).click();
          await expect(page.getByRole('button', { name: '返回帖子列表' })).toBeVisible();
          await page.getByRole('button', { name: '删除帖子', exact: true }).click();
          await page.getByRole('dialog').getByRole('button', { name: '关闭删除确认' }).click();
          await expect(page.getByRole('dialog')).toHaveCount(0);
          await page.getByRole('button', { name: '返回帖子列表' }).click();
          state.status = 'empty';
          await page.getByRole('button', { name: '展开搜索' }).click();
          await page.getByRole('textbox', { name: '搜索帖子' }).fill('找不到的话题');
          await page.getByRole('button', { name: '搜索', exact: true }).click();
          await expect(page.getByRole('heading', { name: '还没有帖子' })).toBeVisible();
          state.status = 'error';
          await page.getByRole('textbox', { name: '搜索帖子' }).fill('失败');
          await page.getByRole('button', { name: '搜索', exact: true }).click();
          await expect(page.getByRole('alert')).toContainText('帖子读取失败');
          state.status = 'ready';
          await page.getByRole('button', { name: '重试帖子' }).click();
          await expect(
            page.getByRole('heading', { name: '岛上的第 1 个话题', exact: true }),
          ).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          if (skin.id === 'pixel-island')
            await page.screenshot({ path: info.outputPath('forum.png') });
        });
      }
  });
