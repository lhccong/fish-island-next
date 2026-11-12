import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow, post } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: compact location, notifications and comment anchor`, async ({
      page,
    }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      await setup(page, false, { visual: true });
      const mobile = (page.viewportSize()?.width ?? 1280) <= 760;
      let notificationState = 'ready';
      let commentFailure = true;
      let missing = false;
      const pages: number[] = [];
      await page.route('**/api/event_remind/**', async (route) => {
        if (!route.request().url().endsWith('/page'))
          return route.fulfill({ json: { code: 0, data: true } });
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (notificationState === 'error') return route.fulfill({ status: 503, json: {} });
        return route.fulfill({
          json: {
            code: 0,
            data: {
              total: notificationState === 'empty' ? 0 : 2,
              records:
                notificationState === 'empty'
                  ? []
                  : [
                      {
                        id: '800',
                        senderId: '999',
                        senderUser: {
                          userName: '通知岛友',
                          userAvatar: 'https://circle.test/avatar.svg',
                        },
                        action: 'comment',
                        sourceContent: missing ? '已删除的评论' : '后页的通知回复',
                        sourceType: 4,
                        sourceId: '1001',
                        state: 0,
                        createTime: '2026-11-12 10:00:00',
                      },
                      {
                        id: '801',
                        senderId: '888',
                        senderUser: {
                          userName: '点赞岛友',
                          userAvatar: 'https://circle.test/avatar.svg',
                        },
                        action: 'like',
                        sourceContent: '',
                        sourceType: 4,
                        sourceId: '1001',
                        state: 0,
                        createTime: '2026-11-12 09:00:00',
                      },
                    ],
            },
          },
        });
      });
      await page.route('**/api/moments/detail?*', (route) =>
        route.fulfill({
          json: {
            code: 0,
            data: {
              ...post,
              location: '摸鱼岛',
              commentNum: 21,
              mediaJson: Array.from({ length: 9 }, (_, i) => ({
                type: 'image',
                url: `https://circle.test/photo-${i}.svg`,
              })),
            },
          },
        }),
      );
      await page.route('**/api/moments/comment/list', async (route) => {
        const current = Number(route.request().postDataJSON().current);
        pages.push(current);
        if (commentFailure) return route.fulfill({ status: 503, json: {} });
        return route.fulfill({
          json: {
            code: 0,
            data: {
              total: 21,
              records: Array.from({ length: current < 3 ? 10 : 1 }, (_, index) => ({
                id: String(3000 + (current - 1) * 10 + index),
                userId: '123',
                userName: '普通岛友',
                content:
                  current === 1 && index === 0 ? '后页的通知回复' : `第${current}页评论${index}`,
                createTime: '2026-11-12 08:00:00',
                children:
                  current === 3
                    ? [
                        {
                          id: '4000',
                          userId: '888',
                          userName: '回复岛友',
                          content: '父级回复',
                          children: [
                            {
                              id: '5000',
                              userId: '999',
                              userName: '通知岛友',
                              content: '后页的通知回复',
                              createTime: '2026-11-12 10:00:00',
                              children: [],
                            },
                          ],
                        },
                      ]
                    : [],
              })),
            },
          },
        });
      });
      const bell = page.getByRole('button', { name: '消息通知', exact: true });
      await bell.click();
      const notifications = page.getByRole('dialog', { name: '全部互动消息', exact: true });
      await expect(notifications.getByText('评论了你的动态')).toBeVisible();
      await expect(notifications.getByText('赞了你的动态')).toBeVisible();
      const list = notifications.getByRole('region', { name: '互动消息列表' });
      expect(
        await list.evaluate((element) => parseFloat(getComputedStyle(element).paddingRight)),
      ).toBe(mobile ? 20 : 24);
      expect(await list.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      const row = notifications.getByRole('button').filter({ hasText: '评论了你的动态' });
      await row.focus();
      await expect(row).toBeFocused();
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('notifications.png') });
      if (mobile) await row.tap();
      else await row.click();
      const detail = page.getByRole('region', { name: '动态详情', exact: true });
      await expect(detail.getByRole('button', { name: '重试评论', exact: true })).toBeVisible();
      const location = detail.getByText('摸鱼岛', { exact: true });
      expect((await location.boundingBox())!.width).toBeLessThan(150);
      commentFailure = false;
      pages.length = 0;
      await detail.getByRole('button', { name: '重试评论', exact: true }).click();
      const highlighted = detail.locator('[data-comment-target="true"]');
      await expect(highlighted).toHaveCount(1);
      await expect(highlighted).toHaveAttribute('data-comment-id', '5000');
      await expect(highlighted).toBeInViewport();
      await expect(highlighted).toBeFocused();
      await expect(highlighted.getByText('通知中的评论')).toBeVisible();
      expect(pages).toEqual([1, 2, 3]);
      await noOverflow(page);
      const viewport = detail.getByRole('region', { name: '动态详情内容' });
      expect(await viewport.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      if (mobile) await expect(detail.locator('[data-radix-scroll-area-scrollbar]')).toBeHidden();
      else await viewport.hover();
      await page.screenshot({ path: info.outputPath('comment-highlight.png') });
      await detail
        .locator('[data-comment-id="4000"]')
        .getByRole('button', { name: '收起回复', exact: true })
        .click();
      await expect(highlighted).toBeHidden();
      await detail
        .locator('[data-comment-id="4000"]')
        .getByRole('button', { name: '查看 1 条回复', exact: true })
        .click();
      await expect(highlighted).toBeVisible();
      await detail.getByRole('button', { name: '返回鱼小圈' }).click();
      missing = true;
      await bell.click();
      await notifications.getByRole('button').filter({ hasText: '已删除的评论' }).click();
      await expect(detail.getByText('未找到这条评论，可能已删除或内容已修改。')).toBeVisible();
      await expect(detail.locator('[data-comment-target="true"]')).toHaveCount(0);
      await detail.getByRole('button', { name: '返回鱼小圈' }).click();
      notificationState = 'error';
      await bell.click();
      await expect(
        notifications.getByRole('button', { name: '重试通知', exact: true }),
      ).toBeVisible();
      await page.screenshot({ path: info.outputPath('notifications-error.png') });
      notificationState = 'empty';
      await notifications.getByRole('button', { name: '重试通知', exact: true }).click();
      await expect(notifications.getByText('暂无互动消息')).toBeVisible();
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('notifications-empty.png') });
      await page.keyboard.press('Escape');
      await expect(bell).toBeFocused();
    });
  }
