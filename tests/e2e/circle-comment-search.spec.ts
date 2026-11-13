import { expect, test } from '@playwright/test';
import { setup, post } from './fish-circle-fixture';

test('bounded comment search continues explicitly and aborts on return', async ({ page }) => {
  await setup(page);
  const pages: number[] = [];
  const releases: (() => void)[] = [];
  let hold = false;
  let ambiguous = false;
  let cancelled = 0;
  page.on('requestfailed', (request) => {
    if (request.url().endsWith('/moments/comment/list')) cancelled++;
  });
  await page.route('**/api/event_remind/**', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: route.request().url().endsWith('/page')
          ? {
              total: 10,
              records: [
                {
                  id: '800',
                  action: 'comment',
                  senderId: '999',
                  senderUser: { userName: '通知岛友' },
                  sourceType: 4,
                  sourceId: post.id,
                  sourceContent: '目标评论',
                  state: 1,
                },
                ...Array.from({ length: 9 }, (_, index) => ({
                  id: String(801 + index),
                  action: 'like',
                  senderId: '888',
                  senderUser: { userName: `点赞岛友${index + 1}` },
                  sourceType: 4,
                  sourceId: post.id,
                  sourceContent: '',
                  state: 1,
                })),
              ],
            }
          : true,
      },
    }),
  );
  await page.route('**/api/moments/detail?*', (route) =>
    route.fulfill({ json: { code: 0, data: { ...post, commentNum: 210 } } }),
  );
  await page.route('**/api/moments/comment/list', async (route) => {
    const current = Number(route.request().postDataJSON().current);
    pages.push(current);
    if (hold) await new Promise<void>((resolve) => releases.push(resolve));
    await route
      .fulfill({
        json: {
          code: 0,
          data: {
            total: 210,
            records: Array.from({ length: 10 }, (_, index) => ({
              id: String(current * 10 + index),
              userId:
                (current === 21 && index === 0) || (ambiguous && current === 1 && index < 2)
                  ? '999'
                  : '123',
              userName: '岛友',
              content:
                (current === 21 && index === 0) || (ambiguous && current === 1 && index < 2)
                  ? '目标评论'
                  : '普通评论',
              children: [],
            })),
          },
        },
      })
      .catch(() => {});
  });
  const bell = page.getByRole('button', { name: '消息通知', exact: true });
  await bell.click();
  const notifications = page.getByRole('dialog', { name: '全部互动消息' });
  const list = notifications.getByRole('region', { name: '互动消息列表' });
  const mobile = (page.viewportSize()?.width ?? 1280) <= 760;
  await expect(notifications.getByText('点赞岛友9')).toBeVisible();
  if (mobile) {
    const session = await page.context().newCDPSession(page);
    const box = (await list.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height - 40;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 5; step++)
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - step * 40 }],
      });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    await expect(notifications.locator('[data-orientation="vertical"]')).toBeHidden();
  } else {
    await list.hover();
    await page.mouse.wheel(0, 600);
    await expect(notifications.locator('[data-orientation="vertical"]')).toBeVisible();
  }
  await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const last = notifications.getByRole('button').filter({ hasText: '点赞岛友9' });
  await last.focus();
  await expect(last).toBeInViewport();
  expect(await list.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page
    .getByRole('dialog', { name: '全部互动消息' })
    .getByRole('button')
    .filter({ hasText: '目标评论' })
    .click();
  const detail = page.getByRole('region', { name: '动态详情', exact: true });
  const more = detail.getByRole('button', { name: '继续查找该评论' });
  await expect(more).toBeVisible();
  expect(Math.max(...pages)).toBe(20);
  await more.click();
  await expect(detail.locator('[data-comment-target="true"]')).toHaveAttribute(
    'data-comment-id',
    '210',
  );
  expect(Math.max(...pages)).toBe(21);
  await detail.getByRole('button', { name: '返回鱼小圈' }).click();
  hold = true;
  await bell.click();
  await page
    .getByRole('dialog', { name: '全部互动消息' })
    .getByRole('button')
    .filter({ hasText: '目标评论' })
    .click();
  await expect(detail.getByText('正在加载评论…')).toBeVisible();
  await expect.poll(() => releases.length).toBeGreaterThan(0);
  await detail.getByRole('button', { name: '返回鱼小圈' }).click();
  await expect.poll(() => cancelled).toBeGreaterThan(0);
  const stoppedAt = pages.length;
  for (const release of releases) release();
  await expect(detail).toHaveCount(0);
  expect(pages).toHaveLength(stoppedAt);
  hold = false;
  ambiguous = true;
  pages.length = 0;
  await bell.click();
  await page
    .getByRole('dialog', { name: '全部互动消息' })
    .getByRole('button')
    .filter({ hasText: '目标评论' })
    .click();
  await expect(detail.getByText('有多条相同评论，暂时无法唯一定位。')).toBeVisible();
  await expect(detail.locator('[data-comment-target="true"]')).toHaveCount(0);
  await detail.locator('[data-scroll-pagination="评论"]').scrollIntoViewIfNeeded();
  await expect.poll(() => Math.max(...pages)).toBeGreaterThanOrEqual(2);
});
