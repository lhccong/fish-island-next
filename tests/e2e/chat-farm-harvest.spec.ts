import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { makeLands } from './farm-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390])
      test.describe(`${skin.id} ${mode} ${width}`, () => {
        test.use({
          viewport: { width, height: 900 },
          isMobile: width <= 760,
          hasTouch: width <= 760,
        });

        test('聊天农场红点随本人作物成熟和收获更新', async ({ page }, info) => {
          await page.clock.install();
          let landReads = 0;
          let harvests = 0;
          const lands = makeLands();
          let reads = 0;
          let failed = false;
          let mature = false;
          const initialRead = Promise.withResolvers<void>();
          const chat = await setupChatMenu(page, skin.id, mode, 'user', async () => {
            await page.route('**/api/land/my', (route) => {
              landReads++;
              return route.fulfill({ json: { code: 0, data: lands } });
            });
            await page.route('**/api/farm/user/info', (route) =>
              route.fulfill({ json: { code: 0, data: { userName: '合成岛友' } } }),
            );
            await page.route('**/api/land/harvest', async (route) => {
              harvests++;
              lands[0]!.status = 0;
              mature = false;
              await route.fulfill({ json: { code: 0, data: [] } });
            });
            await page.route('**/api/land/harvest-status', async (route) => {
              if (++reads === 1) await initialRead.promise;
              await route.fulfill({
                status: failed ? 503 : 200,
                json: { code: 0, data: mature },
              });
            });
          });
          try {
            const click = (locator: Locator) => (width <= 760 ? locator.tap() : locator.click());
            const trigger = page.getByRole('button', { name: '打开农场悬浮窗', exact: true });
            const refresh = () =>
              page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
            const dot = 'data-harvestable';
            await expect.poll(() => reads).toBe(1);
            await expect(trigger).not.toHaveAttribute(dot, 'true');
            expect(landReads).toBe(0);
            const response = page.waitForResponse('**/api/land/harvest-status');
            initialRead.resolve();
            await (await response).finished();
            await expect(trigger).not.toHaveAttribute(dot, 'true');

            mature = true;
            await page.clock.fastForward(30_000);
            await expect(trigger).toHaveAccessibleDescription('有作物可收获');
            failed = true;
            await refresh();
            await expect(trigger).not.toHaveAttribute(dot, 'true');
            failed = false;
            await refresh();
            await expect(trigger).toHaveAttribute(dot, 'true');
            const badge = await trigger.evaluate((button) => {
              const style = getComputedStyle(button, '::after');
              const hitbox = button.getBoundingClientRect();
              return {
                color: style.backgroundColor,
                danger: getComputedStyle(button).getPropertyValue('--color-danger').trim(),
                size: style.width,
                hitbox: [hitbox.width, hitbox.height],
                fits: hitbox.left >= 0 && hitbox.right <= innerWidth,
              };
            });
            expect(badge.color).not.toBe('rgba(0, 0, 0, 0)');
            expect(badge.danger).not.toBe('');
            expect(badge.size).toBe('7px');
            expect(Math.min(...badge.hitbox)).toBeGreaterThanOrEqual(44);
            expect(badge.fits).toBe(true);
            if (width > 760) await trigger.hover();
            if (skin.id === 'wechat')
              await trigger.screenshot({ path: info.outputPath('dot.png') });

            const beforeAppearance = reads;
            await click(page.getByRole('button', { name: '切换主题', exact: true }).last());
            const picker = page.getByRole('dialog', { name: '主题模式' });
            await click(
              picker.getByRole('button', {
                name: skin.id === 'wps' ? '微信绿' : 'WPS 表格',
                exact: true,
              }),
            );
            await click(
              picker.getByRole('button', {
                name: mode === 'dark' ? '明亮模式' : '暗夜模式',
                exact: true,
              }),
            );
            await click(picker.getByRole('button', { name: '关闭主题弹窗', exact: true }));
            await expect(trigger).toHaveAttribute(dot, 'true');
            expect(reads).toBe(beforeAppearance);

            await click(trigger);
            const dialog = page.getByRole('dialog', { name: '摸鱼农场', exact: true });
            await expect(dialog.getByRole('button', { name: /^一键收获 \(/ })).toBeEnabled();
            await expect(trigger).toHaveAttribute(dot, 'true');
            await click(dialog.getByRole('button', { name: /^一键收获 \(/ }));
            await expect(trigger).not.toHaveAttribute(dot, 'true');
            expect(harvests).toBe(1);
            await page.keyboard.press('Escape');
            await expect(dialog).toBeHidden();
            await expect(trigger).toBeFocused();
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
          } finally {
            initialRead.resolve();
            chat.dispose();
          }
        });
      });
