import { expect, test } from '@playwright/test';
import { setup, noOverflow } from './fish-circle-fixture';

test('wechat sidebar preserves legacy cover and cards on desktop and mobile', async ({
  page,
}, testInfo) => {
  if (page.viewportSize()!.width > 760) await page.setViewportSize({ width: 1440, height: 1000 });
  await setup(page, false, { visual: true });
  const card = page.getByRole('article', { name: '合成岛友的动态', exact: true });
  await expect(
    page
      .getByRole('region', { name: '鱼小圈封面', exact: true })
      .getByRole('img', { name: '鱼小圈封面' }),
  ).toBeVisible();
  await expect(card).toHaveCSS('border-radius', page.viewportSize()!.width > 760 ? '16px' : '12px');
  if (page.viewportSize()!.width > 760) {
    const sidebar = page.getByRole('complementary', { name: '鱼小圈导航', exact: true });
    await expect(sidebar.getByRole('heading', { name: '发现', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('button', { name: '全部动态', exact: true })).toHaveCSS(
      'border-radius',
      '0px',
    );
  }
  await expect(card.getByText('给忙碌的一天留一点自己的时间。', { exact: true })).toBeVisible();
  await expect(card.getByText('第四条合成评论', { exact: true })).toHaveCount(0);
  await expect(card).not.toContainText('T08:30:00');
  await expect(page.getByRole('link', { name: '热榜', exact: true }).locator('svg')).toHaveClass(
    /lucide-camera/,
  );
  await expect(page.getByRole('link', { name: '鱼小圈', exact: true }).locator('svg')).toHaveClass(
    /lucide-compass/,
  );
  await noOverflow(page);
  await page.getByRole('region', { name: '主内容滚动区', exact: true }).evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: testInfo.outputPath('circle-final.png'), fullPage: true });
  await page.getByRole('button', { name: '我的鱼小圈', exact: true }).last().click();
  const cover = page.getByRole('region', { name: '鱼小圈封面', exact: true });
  await expect(cover.getByRole('img', { name: '鱼小圈封面', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('circle-profile.png'), fullPage: true });
  if (page.viewportSize()!.width > 1180) {
    const pinned = page.getByRole('complementary', { name: '本页置顶动态', exact: true });
    await expect(pinned).toBeVisible();
    const cardBox = await card.boundingBox();
    const pinsBox = await pinned.boundingBox();
    expect(pinsBox!.x).toBeGreaterThan(cardBox!.x + cardBox!.width);
    await pinned.getByRole('button', { name: '定位置顶动态：合成岛友' }).click();
  } else {
    await page.locator('summary').filter({ hasText: '置顶动态' }).click();
    await page.locator('details').getByRole('button', { name: '定位置顶动态：合成岛友' }).click();
  }
  await expect(card).toBeFocused();
  await card.getByRole('button', { name: '查看更多 2 条评论' }).click();
  await expect(card.getByText('第四条合成评论', { exact: true })).toBeVisible();
  const more = card.getByRole('button', { name: '更多动态操作' });
  await more.click();
  await expect(page.getByRole('menu', { name: '动态操作' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(more).toBeFocused();
  await more.click();
  await page.getByRole('menuitem', { name: '修改', exact: true }).click();
  await page.getByRole('button', { name: '关闭编辑器', exact: true }).click();
  await expect(more).toBeFocused();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await card.getByRole('button', { name: '评论 5', exact: true }).click();
  await card.getByRole('textbox', { name: '评论内容' }).fill('合成的触屏评论');
  if (page.viewportSize()!.width <= 760)
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 540 });
  await card.getByRole('button', { name: '发送评论' }).click();
  await expect(card.getByText('合成的触屏评论', { exact: true })).toBeVisible();
  await noOverflow(page);
});

test('cover failure can retry, while absent or broken images keep a usable fallback', async ({
  page,
}, testInfo) => {
  const state = await setup(page, false, { profileFailure: true });
  await expect(page.getByRole('button', { name: '封面资料加载失败，重试' })).toBeVisible();
  await expect(page.getByRole('article')).toBeVisible();
  await noOverflow(page);
  state.profileFailure = false;
  state.brokenCover = true;
  await page.getByRole('button', { name: '封面资料加载失败，重试' }).click();
  await expect(page.getByRole('region', { name: '鱼小圈封面', exact: true })).toHaveAttribute(
    'aria-busy',
    'false',
  );
  await expect(
    page.getByRole('region', { name: '鱼小圈封面', exact: true }).getByRole('img'),
  ).toHaveCount(0);
  await expect(page.getByRole('button', { name: '查看我的鱼小圈', exact: true })).toBeVisible();
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('cover-fallback.png') });
});

test('a full page of comments and child replies loads, paginates and retries correctly', async ({
  page,
}, testInfo) => {
  const state = await setup(page, false, { commentTotal: 15 });
  const card = page.getByRole('article');
  await expect(card.getByText('给忙碌的一天留一点自己的时间。', { exact: true })).toBeVisible();
  await expect(page.getByText('评论层级异常', { exact: true })).toHaveCount(0);
  await card.getByRole('button', { name: '查看更多 12 条评论', exact: true }).click();
  await expect(card.getByText('第 10 条合成评论', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: '查看 1 条回复', exact: true }).click();
  await expect(card.getByText('第10条的子回复', { exact: true })).toBeVisible();
  state.commentFailure = true;
  await card.getByRole('button', { name: '下一页评论', exact: true }).click();
  await expect(card.getByRole('alert')).toContainText('503');
  await noOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('comments-error.png') });
  state.commentFailure = false;
  await card.getByRole('button', { name: '重试评论', exact: true }).click();
  await expect(card.getByText('第 15 条合成评论', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: '下一页评论', exact: true })).toBeDisabled();
  await card.getByRole('button', { name: '上一页评论', exact: true }).click();
  await card.getByRole('button', { name: '回复 子回复岛友', exact: true }).click();
  await card.getByRole('textbox', { name: '评论内容' }).fill('合成的子回复测试');
  await card.getByRole('button', { name: '发送评论', exact: true }).click();
  await expect(card.getByText('合成的子回复测试', { exact: true })).toBeVisible();
  expect(state.replyParent).toBe('3009');
  expect(state.replyUser).toBe('999');
  await noOverflow(page);
});
