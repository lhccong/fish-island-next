import { expect, test } from '@playwright/test';
import { forumFixture } from './forum-fixture';
import { builtinSkins } from '../../src/skins/builtin';

for (const width of [1280, 375, 390])
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, isMobile: width < 760, hasTouch: width < 760 });
    test('新建、上传、删除、评论与加精', async ({ page }) => {
      const state = await forumFixture(page, 'wechat', 'dark');
      await page.goto('/post/create');
      await page.getByRole('textbox', { name: '标题', exact: true }).fill('发帖测试');
      await page.getByRole('textbox', { name: '正文', exact: true }).fill('帖子正文');
      await page
        .locator('input[type="file"]')
        .first()
        .setInputFiles({
          name: 'test.png',
          mimeType: 'image/png',
          buffer: Buffer.from('synthetic-image'),
        });
      await expect(page.getByRole('textbox', { name: '正文', exact: true })).toHaveValue(
        /upload\.png/,
      );
      state.saveFail = true;
      await page.getByRole('button', { name: '发布帖子', exact: true }).click();
      await expect(page.getByRole('alert')).toContainText('保存失败');
      state.saveFail = false;
      await page.getByRole('button', { name: '发布帖子', exact: true }).click();
      await expect(page).toHaveURL(/\/post\/12$/);
      await page.getByRole('button', { name: '设为精华' }).click();
      await expect(page.getByRole('button', { name: '取消加精' })).toBeVisible();
      await page.getByRole('textbox', { name: '说说你的看法' }).fill('评论发送测试');
      await page.getByRole('button', { name: '发送评论', exact: true }).click();
      expect(state.reply).toMatchObject({ postId: '12', content: '评论发送测试' });
      expect(state.reply).not.toHaveProperty('parentId');
      await page.getByRole('button', { name: '赞 0', exact: true }).click();
      await expect(page.getByRole('button', { name: '已赞 1' })).toBeVisible();
      await page.getByRole('button', { name: '帖子抽奖', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: '查看中奖用户' }).click();
      await expect(page.getByRole('dialog')).toContainText('中奖岛友');
      await page.getByRole('dialog').getByRole('button', { name: '关闭帖子抽奖' }).click();
      await page.getByRole('button', { name: '删除帖子', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: '确认删除', exact: true }).click();
      await expect(page).toHaveURL(/\/post$/);
    });
    test('游客入口及权限', async ({ page }) => {
      await forumFixture(page, 'pixel-island', 'light', 'guest');
      await page.goto('/post/1');
      await expect(page.getByRole('heading', { name: '周末去哪里' })).toBeVisible();
      await expect(page.getByRole('button', { name: '编辑帖子', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: '删除帖子', exact: true })).toHaveCount(0);
      await page.getByRole('button', { name: '点赞 3', exact: true }).click();
      await expect(page).toHaveURL(/\/user\/login$/);
    });
    if (width < 760)
      test('手机触控菜单与滚动可达', async ({ page }) => {
        await forumFixture(page, 'pixel-island', 'dark');
        await page.goto('/post');
        const scroll = page.getByRole('region', { name: '论坛帖子', exact: true });
        await expect(
          scroll.getByRole('heading', { name: '岛上的第 1 个话题', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: '更多操作：岛上的第 1 个话题', exact: true }),
        ).toBeVisible();
        const more = page.getByRole('button', { name: '更多操作：岛上的第 2 个话题', exact: true });
        await more.scrollIntoViewIfNeeded();
        await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await more.tap();
        await page.getByRole('menuitem', { name: '删除', exact: true }).tap();
        await page
          .getByRole('dialog')
          .getByRole('button', { name: '关闭删除确认', exact: true })
          .tap();
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(more).toBeFocused();
      });
  });

test('外观切换保留草稿和请求计数', async ({ page }) => {
  const state = await forumFixture(page, 'wechat', 'light');
  await page.goto('/post/create');
  const title = page.getByRole('textbox', { name: '标题', exact: true });
  await title.fill('切换主题也保留');
  await expect.poll(() => state.reads).toBeGreaterThan(0);
  const reads = state.reads;
  await page.getByRole('button', { name: '切换主题', exact: true }).click();
  for (const skin of builtinSkins) {
    await page.getByRole('button', { name: skin.name, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
    await page.getByRole('button', { name: '暗夜模式', exact: true }).click();
    await page.getByRole('button', { name: '明亮模式', exact: true }).click();
  }
  await page.getByRole('button', { name: '关闭主题弹窗', exact: true }).click();
  await expect(title).toHaveValue('切换主题也保留');
  expect(state.reads).toBe(reads);
});
