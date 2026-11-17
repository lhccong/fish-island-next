import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';

async function assertTreasureLayout(page: Page) {
  const scene = page.getByRole('region', { name: '伙伴营地场景', exact: true });
  const result = await scene.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const hint = el.querySelector('[class*="hint"]')!.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      buttons: [...el.querySelectorAll<HTMLButtonElement>('button[aria-label$="挖宝"]')].map(
        (b) => {
          const r = b.getBoundingClientRect();
          return {
            hintGap: hint.top - r.bottom,
            w: r.width,
            h: r.height,
            contained:
              r.left >= rect.left + 4 &&
              r.right <= rect.right - 4 &&
              r.top >= rect.top + 4 &&
              r.bottom <= rect.bottom - 4,
          };
        },
      ),
    };
  });
  expect(result.overflow).toBe(false);
  for (const button of result.buttons) {
    expect(button.w).toBeGreaterThanOrEqual(44);
    expect(button.h).toBeGreaterThanOrEqual(44);
    expect(button.contained).toBe(true);
    expect(button.hintGap).toBeGreaterThanOrEqual(4);
  }
  const status = page.getByRole('region', { name: '营地挖宝', exact: true });
  expect(await status.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  if (page.viewportSize()!.width < 760) {
    const scroll = page.getByRole('region', { name: '主内容滚动区', exact: true });
    await scroll.evaluate((el) => {
      el.scrollTop = 0;
    });
    await status.scrollIntoViewIfNeeded();
    expect(await scroll.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await scroll.evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe('none');
  }
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: treasure states, 5-second effects and settlement`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        const t = state.treasure;
        const scene = page.getByRole('region', { name: '伙伴营地场景', exact: true });
        const status = page.getByRole('region', { name: '营地挖宝', exact: true });
        const grove = page.getByRole('button', { name: '林间挖宝', exact: true });
        const adventure = scene.locator('..');
        const capture = (name: string) =>
          adventure.screenshot({ path: info.outputPath(`${name}.png`) });
        await expect(grove).toBeEnabled();
        await assertTreasureLayout(page);
        await capture('ready');

        t.hold = true;
        await page.reload();
        await expect(status.getByRole('status')).toContainText('读取挖宝状态');
        await expect(grove).toBeDisabled();
        await capture('loading');
        t.hold = false;
        t.release();
        await expect(grove).toBeEnabled();

        t.fail = true;
        await page.reload();
        await expect(status.getByRole('alert')).toContainText('挖宝状态读取失败');
        await capture('error');
        t.fail = false;
        await status.getByRole('button', { name: '重试挖宝状态' }).click();
        await expect(grove).toBeEnabled();

        t.failStart = true;
        if (width < 760) await grove.tap();
        else {
          await grove.focus();
          await page.keyboard.press('Enter');
        }
        await expect(status.getByRole('alert')).toContainText('开始挖宝失败');
        expect(t.used).toBe(0);
        t.failStart = false;
        await status.getByRole('button', { name: '重试挖宝状态' }).click();
        await expect(grove).toBeEnabled();
        t.failFinish = true;
        const start = Date.now();
        if (width < 760) await grove.tap();
        else await grove.click();
        await expect(status.getByRole('progressbar', { name: '挖宝进度' })).toBeVisible();
        await expect(scene.getByRole('button', { name: /移动伙伴/ })).toBeDisabled();
        await expect(status).toContainText('今日 1/5 次');
        await expect(status).not.toContainText('已到账');
        await capture('digging');
        await expect(status.getByRole('alert')).toContainText('奖励结算失败', { timeout: 10000 });
        expect(Date.now() - start).toBeGreaterThanOrEqual(4900);
        expect(t.finishes).toBe(1);
        expect(t.credits).toBe(0);
        await assertTreasureLayout(page);
        expect(t.finishes).toBe(1);
        t.failFinish = false;
        await status.getByRole('button', { name: '重试挖宝状态' }).click();
        await expect(status).toContainText('挖到 7 积分，已到账');
        expect(t.credits).toBe(1);
        await expect(status).toContainText('距下次刷新');
        await expect(grove).toBeDisabled();
        await capture('success-cooldown');
        await assertTreasureLayout(page);

        t.used = 5;
        await page.reload();
        await expect(status).toContainText('今天已挖满 5 次');
        await expect(grove).toBeDisabled();
        await capture('daily-limit');
        await assertTreasureLayout(page);
        state.empty = true;
        await page.reload();
        await expect(status).toContainText('领养伙伴后');
        await expect(scene.getByRole('button', { name: /挖宝$/ })).toHaveCount(0);
        await capture('empty');
        await assertTreasureLayout(page);
      });
    }
