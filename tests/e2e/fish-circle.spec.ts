import { expect, test } from '@playwright/test';
import { setup, post, noOverflow } from './fish-circle-fixture';

test('feed, loading, pagination, profile filter, empty and retry', async ({ page }, testInfo) => {
  const state = await setup(page, false, { paginate: true });
  await expect(page.getByText(post.content, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('feed.png') });
  await noOverflow(page);
  await page.locator('[data-scroll-pagination="动态"]').scrollIntoViewIfNeeded();
  await expect(page.getByText('第二页的动态', { exact: true })).toBeVisible();
  expect(state.page).toBe(2);
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByText(post.content, { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText(post.content, { exact: true })).toBeVisible();
  state.delay = 400;
  await page.getByRole('button', { name: '刷新动态' }).click();
  await expect(page.getByText('正在加载鱼小圈…')).toBeVisible();
  await noOverflow(page);
  await expect(page.getByText(post.content, { exact: true })).toBeVisible();
  state.delay = 0;
  state.fail = true;
  await page.getByRole('button', { name: '刷新动态' }).click();
  await expect(page.getByRole('alert')).toContainText('503');
  await noOverflow(page);
  state.fail = false;
  state.empty = true;
  await page.getByRole('button', { name: '重试动态' }).click();
  await expect(page.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
  await noOverflow(page);
  state.empty = false;
  await page.getByRole('button', { name: '我的鱼小圈', exact: true }).last().click();
  await expect(page.getByText(post.content, { exact: true })).toBeVisible();
  expect(state.filter).toBe('123');
});

test('publish, like, comment, edit, lottery, top and delete on touch and desktop', async ({
  page,
}) => {
  const state = await setup(page);
  await expect(page.getByText(post.content, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '发布动态', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: '动态内容' }).fill('合成新动态');
  await noOverflow(page);
  state.mutationFailure = true;
  await dialog.getByRole('button', { name: '发布', exact: true }).click();
  await expect(dialog.getByRole('alert')).toHaveText('合成操作失败');
  state.mutationFailure = false;
  await dialog.getByRole('button', { name: '发布', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('发布成功')).toBeVisible();
  expect(state.published).toBe(true);
  await page.getByRole('button', { name: '点赞 0', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消点赞 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '取消点赞 1' }).click();
  await expect(page.getByRole('button', { name: '点赞 0', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '评论 0', exact: true }).click();
  await expect(page.getByText('暂无评论，来聊两句吧')).toBeVisible();
  await page.getByRole('textbox', { name: '评论内容' }).fill('合成评论');
  await page.getByRole('button', { name: '发送评论' }).click();
  await expect(page.getByText('合成评论', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '回复 合成岛友' }).click();
  await expect(page.getByRole('button', { name: '取消回复' })).toBeVisible();
  await page.getByRole('button', { name: '取消回复' }).click();
  await page.getByRole('button', { name: '置顶评论', exact: true }).click();
  await expect.poll(() => state.actions.includes('comment/top')).toBe(true);
  await page.getByRole('button', { name: '删除评论', exact: true }).click();
  await expect(page.getByText('暂无评论，来聊两句吧')).toBeVisible();
  await page.getByRole('button', { name: '更多动态操作' }).click();
  await page.getByRole('menuitem', { name: '修改', exact: true }).click();
  await dialog.getByRole('textbox', { name: '动态内容' }).fill('合成编辑内容');
  await dialog.getByRole('button', { name: '保存修改' }).click();
  await expect(page.getByRole('article').getByText('合成编辑内容', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '更多动态操作' }).click();
  await page.getByRole('menuitem', { name: '发起抽奖', exact: true }).click();
  await dialog.getByRole('button', { name: '确认' }).click();
  await expect(dialog.getByRole('status')).toContainText('合成中奖岛友');
  await dialog.getByRole('button', { name: '完成' }).click();
  await page.getByRole('button', { name: '更多动态操作' }).click();
  await page.getByRole('menuitem', { name: '置顶动态', exact: true }).click();
  await expect.poll(() => state.actions.includes('top')).toBe(true);
  await page.getByRole('button', { name: '更多动态操作' }).click();
  await page.getByRole('menuitem', { name: '删除', exact: true }).click();
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('article').getByText('合成编辑内容', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '更多动态操作' }).click();
  await page.getByRole('menuitem', { name: '删除', exact: true }).click();
  await dialog.getByRole('button', { name: '确认' }).click();
  await dialog.getByRole('button', { name: '完成' }).click();
  await expect(page.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
  await noOverflow(page);
});

test('editor closes with Escape and returns focus', async ({ page }) => {
  await setup(page);
  const publish = page.getByRole('button', { name: '发布动态', exact: true });
  await publish.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(publish).toBeFocused();
});

test('image upload, preview, image comment, reward and follow', async ({ page }, testInfo) => {
  const state = await setup(page, true);
  await expect(page.getByText(post.content, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '发布动态', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('添加图片', { exact: true }).setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: Buffer.from('synthetic-upload'),
  });
  await expect(dialog.getByAltText('待发布图片 1')).toBeVisible();
  await dialog.getByRole('textbox', { name: '动态内容' }).fill('合成图片动态');
  await page.screenshot({ path: testInfo.outputPath('editor.png') });
  await noOverflow(page);
  state.media = [{ type: 'image', url: 'https://circle.test/image.png' }];
  await dialog.getByRole('button', { name: '发布', exact: true }).click();
  await page.getByRole('button', { name: '查看图片 1', exact: true }).click();
  await expect(dialog.getByAltText('动态原图')).toBeVisible();
  await dialog.getByRole('button', { name: '关闭图片预览' }).click();
  await page.getByRole('button', { name: '评论 0', exact: true }).click();
  await page.getByLabel('评论图片', { exact: true }).setInputFiles({
    name: 'synthetic.png',
    mimeType: 'image/png',
    buffer: Buffer.from('synthetic-upload'),
  });
  await expect(page.getByAltText('评论附件 1')).toBeVisible();
  await page.getByRole('button', { name: '发送评论' }).click();
  await expect.poll(() => state.comment).toBe('[img:https://circle.test/image.png]');
  await expect(
    page
      .locator('section[aria-label="评论区"]')
      .getByRole('button', { name: '查看图片 1', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '更多动态操作' }).click();
  await page.getByRole('menuitem', { name: '打赏', exact: true }).click();
  await dialog.getByLabel('打赏积分').fill('5');
  await dialog.getByRole('button', { name: '确认' }).click();
  await expect(dialog.getByRole('status')).toContainText('操作成功');
  await dialog.getByRole('button', { name: '完成' }).click();
  await page.getByRole('button', { name: '查看合成岛友的鱼小圈' }).click();
  await page.getByRole('button', { name: '关注', exact: true }).click();
  await expect(page.getByRole('button', { name: '取消关注', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '取消关注', exact: true }).click();
  await expect(page.getByRole('button', { name: '关注', exact: true })).toBeVisible();
  await noOverflow(page);
});

test('expired session clears the feed and requests login', async ({ page }) => {
  const state = await setup(page);
  await expect(page.getByText(post.content, { exact: true })).toBeVisible();
  state.expired = true;
  await page.getByRole('button', { name: '刷新动态' }).click();
  await expect(page).toHaveURL(/user\/login/);
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText(post.content, { exact: true })).toHaveCount(0);
});
