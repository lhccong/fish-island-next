import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
test.use({ hasTouch: true });
test.setTimeout(90000);
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: compact about navigation and reward states`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(
          ({ skin, mode }) => {
            localStorage.setItem('fish-island:skin', skin);
            localStorage.setItem('fish-island:color-mode', mode);
          },
          { skin: skin.id, mode },
        );
        await page.route('**/api/**', (r) => r.abort());
        let phase = 'loading';
        let release!: () => void;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route('**/api/donation/**/vo', async (route) => {
          if (phase === 'loading') await gate;
          if (phase === 'error') return route.fulfill({ status: 503, body: '{}' });
          const current = route.request().postDataJSON().current as number;
          await route.fulfill({
            json: {
              code: 0,
              data: {
                total: phase === 'empty' ? 0 : 40,
                records:
                  phase === 'empty'
                    ? []
                    : Array.from({ length: 20 }, (_, i) => ({
                        id: String(current * 100 + i),
                        amount: 500 - i,
                        donorUser: {
                          userName:
                            i === 1
                              ? '合成的较长昵称用于窄屏排版检查'
                              : `合成支持者${current}-${i}`,
                        },
                        remark: '这是一条合成的支持留言，用于验证长文本换行。',
                        createTime: '2026-11-12 10:00:00',
                      })),
              },
            },
          });
        });
        await page.goto('/rank/reward');
        const nav = page.getByRole('navigation', { name: '关于模块' }).filter({ visible: true });
        const mobile = width <= 760;
        const check = async () => {
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
          ).toBeLessThanOrEqual(1);
          for (const label of ['赞助榜', '赞助排名滚动区', '打赏动态记录']) {
            const region = page.getByRole('region', { name: label, exact: true });
            expect(
              await region.evaluate((el) => el.scrollWidth - el.clientWidth),
            ).toBeLessThanOrEqual(1);
          }
          if (mobile) {
            expect((await nav.boundingBox())!.height).toBeLessThanOrEqual(58);
            await expect(page.getByRole('link', { name: '返回发现' })).toBeVisible();
          }
        };
        await expect(page.getByText('正在加载排行榜…')).toBeVisible({ timeout: 30000 });
        await check();
        phase = 'error';
        release();
        await expect(page.getByRole('alert')).toHaveCount(2);
        await check();
        phase = 'empty';
        await page.getByRole('button', { name: '重试榜单' }).click();
        await page.getByRole('button', { name: '重试动态' }).click();
        await expect(page.getByText('暂无打赏记录', { exact: true })).toHaveCount(2);
        await check();
        phase = 'ready';
        for (const name of ['共建与反馈', '外卖福利', '其他产品', '赞助榜']) {
          const link = nav.getByRole('link', { name, exact: true });
          if (mobile) await link.tap();
          else await link.click();
          await expect(link).toHaveAttribute('aria-current', 'page');
          await link.focus();
          await expect(link).toBeFocused();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
          ).toBeLessThanOrEqual(1);
        }
        await expect(
          page.getByRole('list', { name: '赞助前三名' }).getByRole('listitem'),
        ).toHaveCount(3);
        await check();
        const leaders = page.getByRole('list', { name: '赞助前三名' }).getByRole('listitem');
        if (mobile) {
          const first = (await leaders.nth(0).boundingBox())!;
          const second = (await leaders.nth(1).boundingBox())!;
          expect(second.y).toBeGreaterThanOrEqual(first.y + first.height - 1);
          await nav.getByRole('link', { name: '狠狠点个 star' }).focus();
          await expect(nav.getByRole('link', { name: '狠狠点个 star' })).toBeInViewport();
          await nav.getByRole('link', { name: '赞助榜', exact: true }).focus();
          await expect(nav.getByRole('link', { name: '赞助榜', exact: true })).toBeInViewport();
        }
        const scroll = page.getByRole('region', { name: '赞助排名滚动区', exact: true });
        await scroll.focus();
        await scroll.press('End');
        await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        await expect(page.getByText('合成支持者2-19', { exact: true }).first()).toHaveCount(1);
        await scroll.evaluate((el) => {
          el.scrollTop = 0;
        });
        await page.getByRole('button', { name: '打赏支持', exact: true }).click();
        await expect(page.getByRole('dialog', { name: '打赏支持 💗' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: '打赏支持', exact: true })).toBeFocused();
        await page.screenshot({ path: info.outputPath('reward.png'), animations: 'disabled' });
      });
    }
