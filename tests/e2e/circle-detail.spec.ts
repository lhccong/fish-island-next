import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow, post } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: switches main content to detail and back`, async ({ page }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      let listRequests = 0;
      page.on('request', (request) => {
        if (new URL(request.url()).pathname.endsWith('/moments/list')) listRequests++;
      });
      const state = await setup(page, false, { visual: true });
      const mobile = (page.viewportSize()?.width ?? 1280) <= 760;
      state.commentTotal = 0;
      let detailFail = true;
      let readFail = true;
      let requests = 0;
      let releaseLoading: () => void = () => {};
      const loadingGate = new Promise<void>((resolve) => {
        releaseLoading = resolve;
      });
      await page.route('**/api/event_remind/**', async (route) => {
        if (!route.request().url().endsWith('/page')) {
          await new Promise((resolve) => setTimeout(resolve, 700));
          return route.fulfill({
            json: readFail ? { code: 40000, message: '标记已读失败' } : { code: 0, data: true },
          });
        }
        return route.fulfill({
          json: {
            code: 0,
            data: {
              total: 10,
              records: Array.from({ length: 10 }, (_, i) => ({
                id: String(800 + i),
                senderUser: { userName: `通知岛友${i}` },
                action: 'comment',
                sourceContent: `评论内容${i}`,
                sourceType: i === 0 ? 1 : 4,
                sourceId: '1001',
                state: 0,
              })),
            },
          },
        });
      });
      await page.route('**/api/moments/detail?*', async (route) => {
        requests++;
        expect(new URL(route.request().url()).searchParams.get('id')).toBe('1001');
        await loadingGate;
        await new Promise((resolve) => setTimeout(resolve, 300));
        return route.fulfill({
          json: detailFail
            ? { code: 40000, message: '动态暂不可用，请重试' }
            : {
                code: 0,
                data: {
                  ...post,
                  userAvatar: 'https://circle.test/avatar.svg',
                  mediaJson: Array.from({ length: 9 }, (_, i) => ({
                    type: 'image',
                    url: `https://circle.test/photo-${i}.svg`,
                  })),
                  likeUserNames: '清风,海盐,小岛',
                  likeNum: state.liked ? 4 : 3,
                  liked: state.liked,
                },
              },
        });
      });
      const feed = page.getByRole('region', { name: '鱼小圈列表滚动区', exact: true });
      const feedCard = feed.getByRole('article').first();
      await feedCard.getByRole('button', { name: /^评论 \d/ }).click();
      await feedCard.getByRole('textbox', { name: '评论内容' }).fill('返回后保留的列表草稿');
      const bell = page.getByRole('button', { name: '消息通知', exact: true });
      await bell.click();
      const notifications = page.getByRole('dialog', { name: '全部互动消息', exact: true });
      const row = notifications.getByRole('button').filter({ hasText: '评论内容9' });
      await row.scrollIntoViewIfNeeded();
      await row.focus();
      await feed.evaluate((element) => {
        element.scrollTop = 120;
      });
      const position = await feed.evaluate((element) => element.scrollTop);
      const before = listRequests;
      if (mobile) await row.tap();
      else await row.click();
      const detail = page.getByRole('region', { name: '动态详情', exact: true });
      await expect(notifications).toBeHidden();
      await expect(feed).toBeHidden();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await detail.evaluate((element) => !!element.closest('main'))).toBe(true);
      expect(await detail.evaluate((element) => getComputedStyle(element).position)).not.toBe(
        'fixed',
      );
      await expect(detail.getByRole('status')).toHaveText('正在加载动态详情…');
      releaseLoading();
      await expect(detail.getByRole('alert')).toContainText('动态暂不可用');
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('detail-error.png') });
      detailFail = false;
      await detail.getByRole('button', { name: '重试详情' }).click();
      await expect(detail.getByText(post.content, { exact: true })).toBeVisible();
      const viewport = detail.getByRole('region', { name: '动态详情内容' });
      await viewport.evaluate((element) => {
        element.scrollTop = 0;
      });
      const gutter = await viewport.evaluate((element) =>
        parseFloat(getComputedStyle(element).paddingRight),
      );
      expect(gutter).toBe(mobile ? 20 : 24);
      expect(await viewport.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      if (mobile) {
        expect((await detail.boundingBox())!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        await expect(detail.locator('[data-radix-scroll-area-scrollbar]')).toBeHidden();
      }
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('detail-success.png') });
      await detail.getByRole('button', { name: '查看图片 9', exact: true }).click();
      const preview = page.getByRole('dialog', { name: '图片预览' });
      await expect(preview.getByRole('img', { name: '动态原图' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(detail.getByRole('button', { name: '查看图片 9', exact: true })).toBeFocused();
      await detail.getByRole('button', { name: '点赞 3', exact: true }).click();
      await expect(detail.getByRole('button', { name: '取消点赞 4', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await detail.getByRole('button', { name: '评论 0', exact: true }).click();
      await expect(detail.getByText('暂无评论，来聊两句吧')).toBeVisible();
      const input = detail.getByRole('textbox').first();
      await input.fill('详情评论测试');
      await input.focus();
      await expect(input).toBeFocused();
      await viewport.evaluate((element) => {
        element.scrollTop = 0;
      });
      if (mobile) {
        const session = await page.context().newCDPSession(page);
        const box = (await viewport.boundingBox())!;
        const x = box.x + box.width / 2;
        const y = box.y + box.height - 60;
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 6; step++)
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - step * 60 }],
          });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
      } else {
        await viewport.hover();
        await page.mouse.wheel(0, 1200);
      }
      await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expect(detail.getByRole('button', { name: '返回鱼小圈' })).toBeInViewport();
      await detail.getByRole('button', { name: '返回鱼小圈' }).click();
      await expect(bell).toBeFocused();
      expect(await feed.evaluate((element) => element.scrollTop)).toBe(position);
      expect(listRequests).toBe(before);
      await expect(feedCard.getByRole('textbox', { name: '评论内容' })).toHaveValue(
        '返回后保留的列表草稿',
      );
      await bell.click();
      await expect(notifications.getByRole('alert')).toHaveText('标记已读失败');
      readFail = false;
      await row.click();
      await expect(detail.getByText(post.content, { exact: true })).toBeVisible();
      await detail.getByRole('button', { name: '返回鱼小圈' }).click();
      await expect(detail).toBeHidden();
      await expect(bell).toBeFocused();
      await bell.click();
      const loadedRequests = requests;
      expect(loadedRequests).toBeGreaterThanOrEqual(3);
      // Non-moment notifications keep an honest unavailable state instead of a fake post.
      await notifications.getByRole('button').filter({ hasText: '评论内容0' }).click();
      const unsupported = page.getByRole('region', { name: '通知详情', exact: true });
      await expect(unsupported.getByText('此类消息的关联详情尚未迁移。')).toBeVisible();
      expect(requests).toBe(loadedRequests);
      await unsupported.getByRole('button', { name: '返回鱼小圈' }).click();
    });
  }
