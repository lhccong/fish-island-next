import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';

async function appearance(page: Page, skin: string, mode: string) {
  await page
    .getByRole('button', { name: '切换主题', exact: true })
    .filter({ visible: true })
    .click();
  const dialog = page.getByRole('dialog', { name: '主题模式', exact: true });
  await dialog.getByRole('button', { name: skin, exact: true }).click();
  await dialog.getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式' }).click();
  await dialog.getByRole('button', { name: '关闭', exact: true }).click();
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: circle layout persists without resetting chat`, async ({
      page,
    }, info) => {
      test.setTimeout(120000);
      let phase = 'loading';
      const pending: Array<() => void> = [];
      const release = () => pending.splice(0).forEach((resolve) => resolve());
      let requests = 0;
      try {
        const fixture = await setupChatMenu(page, skin.id, mode, 'user', async () => {
          await page.route('**/api/moments/list', async (route) => {
            requests++;
            if (phase === 'loading') await new Promise<void>((resolve) => pending.push(resolve));
            if (phase === 'error') return route.fulfill({ status: 503 });
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  total: phase === 'empty' ? 0 : 20,
                  records:
                    phase === 'empty'
                      ? []
                      : Array.from({ length: 20 }, (_, i) => ({
                          id: String(i + 1),
                          userId: '456',
                          userName: '合成岛友',
                          content: `布局验证动态 ${i + 1}`,
                          createTime: '2026-11-17 10:00:00',
                        })),
                },
              },
            });
          });
        });
        const mobile = page.viewportSize()!.width <= 760;
        const originalViewport = page.viewportSize()!;
        const draft = page.getByRole('textbox', { name: '消息草稿', exact: true });
        await draft.fill('布局切换保留草稿');
        fixture.push('991', '布局切换保留消息');
        await expect(page.getByText('布局切换保留消息', { exact: true })).toBeVisible();
        const feed = page
          .getByRole('region', { name: '海岛鱼小圈', exact: true })
          .filter({ visible: true });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const beforeAppearance = fixture.stats();
        if (skin.id !== 'moyu-island') await appearance(page, '摸鱼岛', mode);
        if (mobile) await page.setViewportSize({ width: 1440, height: 900 });
        const bounds = async () => {
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          expect(await feed.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        };
        await expect(feed.getByText('正在加载动态…', { exact: true })).toBeVisible();
        await bounds();
        await expect.poll(() => pending.length).toBeGreaterThan(0);
        phase = 'error';
        release();
        await expect(feed.getByRole('alert')).toBeVisible();
        await bounds();
        phase = 'empty';
        await feed.getByRole('button', { name: '重试动态', exact: true }).click();
        await expect(feed.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
        await bounds();
        phase = 'success';
        await feed.getByRole('button', { name: '刷新动态', exact: true }).click();
        await expect(feed.getByText('布局验证动态 1', { exact: true })).toBeVisible();
        await bounds();
        if (mobile) await page.setViewportSize(originalViewport);
        const picker = page.getByRole('combobox', {
          name: mobile ? '鱼小圈电脑布局' : '调整鱼小圈布局',
          exact: true,
        });
        const choose = async (side: string) => {
          if (mobile) await picker.tap();
          else await picker.click();
          const option = page.getByRole('option', { name: `聊天室${side}侧`, exact: true });
          const optionBounds = (await option.boundingBox())!;
          expect(optionBounds.x).toBeGreaterThanOrEqual(0);
          expect(optionBounds.x + optionBounds.width).toBeLessThanOrEqual(
            page.viewportSize()!.width,
          );
          if (mobile) await option.tap();
          else await option.click();
          await expect(picker).toBeFocused();
        };
        await expect(picker).toBeVisible();
        expect((await picker.boundingBox())!.width).toBeGreaterThanOrEqual(44);
        await picker.focus();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('listbox')).toBeVisible();
        if (skin.id === 'moyu-island')
          await page.screenshot({ path: info.outputPath('layout-options.png') });
        await page.keyboard.press('Escape');
        await expect(picker).toBeFocused();
        const scroll = feed.getByRole('region', { name: '海岛动态滚动区', exact: true });
        let top = 0;
        if (!mobile) {
          await scroll.focus();
          await page.keyboard.press('End');
          await expect
            .poll(() =>
              scroll.evaluate((el) => Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop)),
            )
            .toBeLessThanOrEqual(1);
          top = await scroll.evaluate((el) => el.scrollTop);
        }
        const before = fixture.stats();
        const requestCount = requests;
        const verifyPosition = async (right: boolean) => {
          if (page.viewportSize()!.width <= 760) return;
          const side = (await page.locator('#classic-circle-sidebar').boundingBox())!;
          const chat = (await page.locator('#main-content').boundingBox())!;
          expect(right ? side.x >= chat.x + chat.width : chat.x >= side.x + side.width).toBe(true);
        };
        await choose('右');
        await verifyPosition(true);
        if (!mobile) {
          expect(await scroll.evaluate((el) => el.scrollTop)).toBe(top);
          await bounds();
        }
        await page.screenshot({ path: info.outputPath('right.png') });
        await choose('左');
        await verifyPosition(false);
        await choose('右');
        expect(fixture.stats().connections).toBe(before.connections);
        expect(fixture.stats().historyRequests).toBe(before.historyRequests);
        expect(requests).toBe(requestCount);
        await expect(draft).toHaveText('布局切换保留草稿');
        await expect(page.getByText('布局切换保留消息', { exact: true })).toBeVisible();
        if (mobile) await page.setViewportSize({ width: 1440, height: 900 });
        await page.getByRole('button', { name: '收起鱼小圈', exact: true }).click();
        await expect(page.locator('#classic-circle-sidebar')).toBeHidden();
        await page.getByRole('button', { name: '展开鱼小圈', exact: true }).click();
        await verifyPosition(true);
        if (!mobile) expect(await scroll.evaluate((el) => el.scrollTop)).toBe(top);
        if (mobile) await page.setViewportSize(originalViewport);
        await appearance(page, skin.name, mode === 'light' ? 'dark' : 'light');
        await appearance(page, '摸鱼岛', mode);
        await expect(draft).toHaveText('布局切换保留草稿');
        expect(fixture.stats().connections).toBe(beforeAppearance.connections);
        expect(fixture.stats().historyRequests).toBe(beforeAppearance.historyRequests);
        await verifyPosition(true);
        await page.reload();
        await expect(draft).toBeVisible();
        if (skin.id !== 'moyu-island') await appearance(page, '摸鱼岛', mode);
        await expect(picker).toHaveAttribute('title', /聊天室右侧/);
        await verifyPosition(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        if (!mobile) await bounds();
        await page.screenshot({ path: info.outputPath('restored.png') });
      } finally {
        release();
      }
    });
