import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { farmFixture } from './farm-fixture';
test('全部主题明暗模式的手机触屏滚动、单地操作和焦点', async ({ browser }, testInfo) => {
  test.setTimeout(240000);
  for (const width of [375, 390]) {
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width, height: 844 },
    });
    try {
      const page = await context.newPage();
      await farmFixture(page);
      await page.goto('/game/farm');
      await expect(page.getByRole('button', { name: /^1号地/ })).toBeVisible({ timeout: 30000 });
      const client = await context.newCDPSession(page);
      for (const skin of builtinSkins)
        for (const mode of ['light', 'dark']) {
          await page.evaluate(
            async ({ skin, mode }) => {
              const { useAppearanceStore } = await import('/src/features/appearance/index.ts');
              useAppearanceStore.getState().setSkinId(skin as never);
              useAppearanceStore.getState().setColorMode(mode as never);
            },
            { skin: skin.id, mode },
          );
          const trigger = page.getByRole('button', { name: /批量播种/ });
          await trigger.tap();
          const region = page.getByRole('region', { name: '种子目录' });
          await expect(region.getByRole('button')).toHaveCount(22);
          await expect(region).toBeVisible();
          if (skin.id === 'wps' && mode === 'light')
            await page.screenshot({ path: testInfo.outputPath(`seed-${width}.png`) });
          const rect = (await region.boundingBox())!;
          const x = rect.x + rect.width / 2;
          const y = rect.y + rect.height - 30;
          await client.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 10; step++) {
            await client.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - step * 20 }],
            });
            await page.evaluate(() => new Promise(requestAnimationFrame));
          }
          await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await expect.poll(() => region.evaluate((e) => e.scrollTop)).toBeGreaterThan(0);
          await region.focus();
          await page.keyboard.press('End');
          await expect
            .poll(() => region.evaluate((e) => e.scrollTop + e.clientHeight >= e.scrollHeight - 2))
            .toBe(true);
          expect(await region.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
          await region.press('Home');
          await expect(region.getByRole('button').first()).toBeVisible();
          await page.getByRole('button', { name: '关闭种子选择' }).tap();
          await expect(trigger).toBeFocused();
          const lastLand = page.getByRole('button', { name: /^24号地/ });
          await lastLand.scrollIntoViewIfNeeded();
          await lastLand.tap();
          await expect(
            page.getByRole('dialog').getByText('暂未开放开垦，请等待后续开放。'),
          ).toBeVisible();
          await expect(page.getByRole('button', { name: '确认开垦' })).toBeDisabled();
          await page.getByRole('button', { name: '关闭地块详情' }).tap();
          await expect(lastLand).toBeFocused();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        }
    } finally {
      await context.close();
    }
  }
});
test('单地播种浇水、成熟收获、好友及访客失败重试', async ({ page }) => {
  await farmFixture(page);
  await page.goto('/game/farm');
  await page.getByRole('button', { name: /^5号地/ }).click();
  await page.getByRole('button', { name: '选择种子', exact: true }).click();
  await page.getByRole('button', { name: /^小萝卜.*30 分钟/ }).click();
  await page.getByRole('button', { name: '确认播种' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('播种成功', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^2号地/ }).click();
  await page.getByRole('button', { name: '浇水', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('浇水成功', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^2号地/ }).click();
  await expect(page.getByRole('button', { name: '浇水', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /^1号地/ }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('收获成功', { exact: true })).toBeVisible();
  let fail = true;
  await page.route('**/api/farm/friend/list', (r) =>
    r.fulfill({ status: fail ? 503 : 200, json: { code: 0, data: [] } }),
  );
  await page.getByRole('button', { name: '好友', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('HTTP 503');
  fail = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.getByText('还没有同玩好友，互相关注后会出现在这里。')).toBeVisible();
  await page.keyboard.press('Escape');
  let failRead = true;
  await page.route('**/api/steal/my-stolen/read-all', (r) =>
    r.fulfill({ status: failRead ? 503 : 200, json: { code: 0, data: true } }),
  );
  await page.getByRole('button', { name: '访客', exact: true }).click();
  await page.getByRole('button', { name: '全部已读', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('HTTP 503');
  failRead = false;
  await page.getByRole('button', { name: '全部已读', exact: true }).click();
  await expect(page.getByText('访客记录已全部标记已读')).toBeVisible();
});
