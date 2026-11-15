import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: lottery lifecycle and shared free draw`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await setupPet(page, skin.id, mode);
        const names = [
          '普通的法杖',
          '勇者围脖',
          '野人帽',
          '紫色护手',
          '纯白护手',
          '魔术帽',
          '烈焰靴',
          '花之冠',
          '审判引擎',
        ];
        const prizes = names.map((name, i) => ({
          id: String(i + 1),
          prizeId: String(i + 101),
          name,
          icon: 'https://camp.test/item.svg',
          quality: Math.floor(i / 2),
          qualityName: ['普通(N)', '稀有(R)', '史诗(SR)', '传说(SSR)'][
            Math.min(3, Math.floor(i / 2))
          ],
        }));
        let phase = 'error';
        let draws = 0;
        let total = 0;
        let recordsRead = 0;
        let recordFailures = 0;
        const records: object[] = [];
        let releaseLoading = () => {};
        const loadingGate = new Promise<void>((resolve) => {
          releaseLoading = resolve;
        });
        await page.route('**/api/turntable/**', async (route) => {
          const url = new URL(route.request().url());
          const path = url.pathname;
          if (path.endsWith('/list')) {
            if (phase === 'error') await loadingGate;
            if (phase === 'error')
              return route.fulfill({ json: { code: 50000, message: '转盘读取失败，请重试' } });
            return route.fulfill({
              json: {
                code: 0,
                data:
                  phase === 'empty'
                    ? []
                    : [
                        { id: '3', name: '摸鱼大转盘' },
                        { id: '4', name: '幸运转盘' },
                      ],
              },
            });
          }
          if (path.includes('/detail/'))
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  id: path.split('/').at(-1),
                  name: '摸鱼大转盘',
                  costPoints: 100,
                  guaranteeCount: 300,
                  prizeList: prizes,
                  userProgress: { totalDrawCount: total },
                },
              },
            });
          if (path.endsWith('/records')) {
            recordsRead++;
            const current = Number(url.searchParams.get('current'));
            if (current === 2 && url.searchParams.has('turntableId') && recordFailures++ === 0)
              return route.fulfill({ json: { code: 50000, message: '记录续载失败' } });
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  records: records.slice((current - 1) * 13, current * 13),
                  total: records.length,
                },
              },
            });
          }
          if (path.endsWith('/draw')) {
            const body = route.request().postDataJSON();
            draws++;
            total += body.drawCount;
            if (draws === 3)
              return route.fulfill({
                json: { code: 50000, message: '积分不足，请补充积分后重试' },
              });
            records.unshift({
              ...prizes[8],
              id: String(draws),
              createTime: new Date().toISOString(),
            });
            if (draws === 2)
              records.push(
                ...Array.from({ length: 25 }, (_, i) => ({
                  ...prizes[i % 9],
                  id: String(1000 + i),
                  createTime: '2026-11-14 09:00',
                })),
              );
            return route.fulfill({
              json: {
                code: 0,
                data: {
                  costPoints: body.drawCount === 1 && draws === 1 ? 0 : body.drawCount * 100,
                  prizeList: Array.from({ length: body.drawCount }, () => ({
                    ...prizes[8],
                    turntablePrizeId: '9',
                  })),
                },
              },
            });
          }
          return route.fallback();
        });
        const open = async () => {
          await page.getByRole('button', { name: '抽奖转盘', exact: true }).click();
          return page.getByRole('dialog', { name: '抽奖转盘', exact: true });
        };
        let dialog = await open();
        await expect(dialog.getByRole('status')).toContainText('正在整理营地资料');
        releaseLoading();
        await expect(dialog.getByRole('alert')).toContainText('转盘读取失败');
        phase = 'empty';
        await dialog.getByRole('button', { name: '重试', exact: true }).click();
        await expect(dialog.getByText('暂无开放的抽奖转盘，请稍后再来。')).toBeVisible();
        await page.getByRole('button', { name: '关闭面板', exact: true }).click();
        phase = 'ready';
        dialog = await open();
        await expect(
          dialog.getByRole('button', { name: '单抽 · 免费', exact: true }),
        ).toBeVisible();
        await expect(dialog.getByText('暂无中奖记录', { exact: true })).toBeVisible();
        await assertPetLayout(page);
        if (skin.id === 'pixel-island')
          await page.screenshot({ path: info.outputPath('lottery-initial.png') });
        await dialog.getByRole('button', { name: '单抽 · 免费', exact: true }).tap();
        await expect(dialog.getByRole('heading', { name: '本次抽奖 · 消耗 0 积分' })).toBeVisible();
        await expect(dialog.getByRole('button', { name: '单抽 · 100 积分' })).toBeEnabled();
        await dialog.getByRole('button', { name: '幸运转盘', exact: true }).click();
        await expect(dialog.getByRole('button', { name: '单抽 · 100 积分' })).toBeVisible();
        await expect(dialog.getByRole('button', { name: '单抽 · 免费' })).toHaveCount(0);
        await dialog.getByRole('button', { name: '十连抽 · 1000 积分' }).click();
        const results = page.getByRole('dialog', { name: '十连抽结果', exact: true });
        await expect(results.getByRole('img', { name: '审判引擎', exact: true })).toHaveCount(10);
        await assertPetLayout(page);
        await results.getByRole('button', { name: '关闭面板', exact: true }).click();
        await expect(dialog.getByRole('button', { name: '查看十连抽结果' })).toBeFocused();
        await dialog.getByRole('button', { name: '单抽 · 100 积分' }).click();
        await expect(dialog.getByRole('alert')).toContainText('积分不足');
        await assertPetLayout(page);
        expect(recordsRead).toBeGreaterThan(2);
        const history = dialog.getByRole('region', { name: '我的中奖记录' });
        await history.locator('[data-scroll-pagination]').scrollIntoViewIfNeeded();
        await expect(history.getByRole('alert')).toContainText('记录续载失败');
        await expect(history.locator('article')).toHaveCount(13);
        await history.getByRole('button', { name: '重试中奖记录' }).tap();
        await expect(history.locator('article')).toHaveCount(26);
        await history.locator('[data-scroll-pagination]').scrollIntoViewIfNeeded();
        await expect(history.locator('article')).toHaveCount(27);
        await history.locator('[data-scroll-pagination]').scrollIntoViewIfNeeded();
        await expect(history.getByText('已全部加载', { exact: true })).toBeVisible();
        const recordsViewport = history.getByRole('region', { name: '中奖记录列表' });
        const metrics = await recordsViewport.evaluate((element) => ({
          height: element.clientHeight,
          scrollHeight: element.scrollHeight,
          width: element.clientWidth,
          scrollWidth: element.scrollWidth,
          gutter: parseFloat(getComputedStyle(element).paddingRight),
          top: element.scrollTop,
        }));
        expect(metrics.height).toBeLessThanOrEqual(width <= 760 ? 300 : 440);
        expect(metrics.scrollHeight).toBeGreaterThan(metrics.height);
        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.width + 1);
        expect(metrics.gutter).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
        expect(metrics.top).toBeGreaterThan(0);
        await recordsViewport.focus();
        await page.keyboard.press('Home');
        await expect.poll(() => recordsViewport.evaluate((element) => element.scrollTop)).toBe(0);
        await page.keyboard.press('End');
        await expect
          .poll(() => recordsViewport.evaluate((element) => element.scrollTop))
          .toBeGreaterThan(0);
        const track = history.locator('[data-orientation="vertical"]');
        if (width > 760) {
          await history.hover();
          await expect(track).toHaveCSS('opacity', '1');
        } else await expect(track).toHaveCSS('visibility', 'hidden');
        await assertPetLayout(page);
        if (skin.id === 'pixel-island')
          await page.screenshot({ path: info.outputPath('lottery.png') });
        await page.getByRole('button', { name: '关闭面板', exact: true }).click();
        await expect(page.getByRole('button', { name: '抽奖转盘', exact: true })).toBeFocused();
        dialog = await open();
        await expect(dialog.getByRole('button', { name: '单抽 · 100 积分' })).toBeVisible();
        await page.keyboard.press('Escape');
      });
    }
