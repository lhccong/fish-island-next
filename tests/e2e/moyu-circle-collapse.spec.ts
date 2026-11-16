import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

test.setTimeout(60_000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: circle visibility preserves chat and feed`, async ({
      page,
    }, info) => {
      let state: 'loading' | 'empty' | 'error' | 'success' = 'loading';
      let release: (() => void) | undefined;
      let requests = 0;
      const fixture = await setupChatMenu(page, skin.id, mode, 'user', async () => {
        await page.route('**/api/moments/list', async (route) => {
          requests++;
          if (state === 'loading')
            await new Promise<void>((resolve) => {
              release = resolve;
            });
          if (state === 'error') return route.fulfill({ status: 503 });
          await route.fulfill({
            json: {
              code: 0,
              data: {
                total: state === 'empty' ? 0 : 20,
                records:
                  state === 'empty'
                    ? []
                    : Array.from({ length: 20 }, (_, i) => ({
                        id: String(i + 1),
                        userId: '456',
                        userName: '合成岛友',
                        content: `收起验证动态 ${i + 1}`,
                        createTime: '2026-11-16 10:00:00',
                      })),
              },
            },
          });
        });
      });
      const mobile = page.viewportSize()!.width <= 760;
      const toggle = () =>
        page.getByRole('button', { name: /^(收起|展开)鱼小圈$/ }).filter({ visible: true });
      const bounds = async () => {
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect(page.getByRole('textbox', { name: '消息草稿', exact: true })).toBeVisible();
      };
      if (skin.id !== 'moyu-island') {
        await expect(toggle()).toHaveCount(0);
        state = 'empty';
        release?.();
        await bounds();
        return;
      }
      const openMobile = async () => {
        await page.getByRole('button', { name: '打开我的小岛', exact: true }).tap();
      };
      if (mobile) await openMobile();
      await expect(
        page.getByText('正在加载动态…', { exact: true }).filter({ visible: true }),
      ).toBeVisible();
      if (!mobile) {
        await expect(
          page.locator('#classic-circle-sidebar').getByRole('button', { name: '收起鱼小圈' }),
        ).toBeVisible();
        await expect(toggle()).toHaveText('');
        await toggle().focus();
        await page.keyboard.press('Enter');
        await expect(toggle()).toHaveAttribute('aria-expanded', 'false');
        await expect(toggle()).toBeFocused();
        await expect(page.locator('#classic-circle-sidebar')).toBeHidden();
        await page.keyboard.press('Space');
        await expect(toggle()).toHaveAttribute('aria-expanded', 'true');
        await expect(toggle()).toBeFocused();
      }
      state = 'empty';
      release!();
      await expect(
        page.getByText('还没有动态，分享第一条摸鱼日常吧').filter({ visible: true }),
      ).toBeVisible();
      if (mobile) {
        await page.getByRole('button', { name: '关闭我的小岛', exact: true }).tap();
        await expect(page.getByRole('button', { name: '打开我的小岛', exact: true })).toBeFocused();
      }
      state = 'error';
      await page.reload();
      await expect(page.getByRole('textbox', { name: '消息草稿', exact: true })).toBeVisible();
      if (mobile) await openMobile();
      await expect(
        page.getByRole('button', { name: '重试动态', exact: true }).filter({ visible: true }),
      ).toBeVisible();
      state = 'success';
      await page
        .getByRole('button', { name: '重试动态', exact: true })
        .filter({ visible: true })
        .click();
      const scroll = page
        .getByRole('region', { name: '海岛动态滚动区', exact: true })
        .filter({ visible: true });
      await expect(scroll.getByText('收起验证动态 1', { exact: true })).toBeVisible();
      if (mobile) {
        const box = (await scroll.boundingBox())!;
        const session = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2;
        const y = box.y + Math.min(box.height - 30, 350);
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let i = 1; i <= 8; i++)
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - i * 25 }],
          });
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await session.detach();
        await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await page.screenshot({ path: info.outputPath(`mobile-circle-${mode}.png`) });
      }
      await scroll.focus();
      await page.keyboard.press('End');
      await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await expect
        .poll(() =>
          scroll.evaluate((el) => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop)),
        )
        .toBeLessThanOrEqual(1);
      const top = await scroll.evaluate((el) => el.scrollTop);
      if (mobile) {
        await page.getByRole('button', { name: '关闭我的小岛', exact: true }).tap();
        await bounds();
      } else {
        const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
        await draft.fill('收起后保留草稿');
        const before = fixture.stats();
        const requestCount = requests;
        const width = (await page.locator('#main-content').boundingBox())!.width;
        await toggle().click();
        await expect(page.locator('#classic-circle-sidebar')).toBeHidden();
        expect((await page.locator('#main-content').boundingBox())!.width).toBeGreaterThan(width);
        await bounds();
        await page.screenshot({ path: info.outputPath(`collapsed-${mode}.png`) });
        await toggle().click();
        await expect(scroll).toBeVisible();
        expect(await scroll.evaluate((el) => el.scrollTop)).toBe(top);
        await expect(draft).toHaveText('收起后保留草稿');
        expect(fixture.stats().connections).toBe(before.connections);
        expect(fixture.stats().historyRequests).toBe(before.historyRequests);
        expect(requests).toBe(requestCount);
        await page.screenshot({ path: info.outputPath(`expanded-${mode}.png`) });
      }
      await bounds();
    });
