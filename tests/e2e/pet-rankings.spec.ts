import { expect, test, type Page, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { setupRankings } from './pet-rankings-fixture';
import { assertPetLayout } from './pet-layout';

async function openRanking(page: Page, kind: string) {
  await page
    .getByRole('button', {
      name: kind === 'boss' ? /^宠物 Boss/ : kind === 'tower' ? /^宠物爬塔/ : /^挑战/,
    })
    .click();
  const challenge = page.getByRole('dialog', { name: '挑战', exact: true });
  if (kind === 'boss') {
    await challenge.getByRole('button', { name: '贡献排行', exact: true }).click();
    return page.getByRole('dialog', { name: '首领贡献排行', exact: true });
  }
  if (kind === 'tower') {
    await challenge.getByRole('button', { name: '爬塔排行', exact: true }).click();
    return page.getByRole('dialog', { name: '爬塔排行', exact: true });
  }
  if (kind === 'tournament') {
    await challenge.getByRole('combobox', { name: '挑战分类' }).click();
    await page.getByRole('option', { name: '每日排位', exact: true }).click();
  }
  return challenge;
}
async function closeAll(page: Page) {
  while (await page.getByRole('dialog').count())
    await page
      .getByRole('dialog')
      .last()
      .getByRole('button', { name: '关闭面板', exact: true })
      .click();
}
async function inspectRanking(page: Page, panel: Locator) {
  await assertPetLayout(page);
  const rows = panel.locator('ol > li');
  await expect(rows).toHaveCount(20);
  expect(
    await rows.evaluateAll((elements) => elements.every((el) => el.scrollWidth <= el.clientWidth)),
  ).toBe(true);
  await expect(
    rows.first().getByRole('img', { name: '合成岛友 1的头像', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      rows
        .first()
        .locator('img')
        .first()
        .evaluate((el: HTMLImageElement) => el.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    rows.nth(2).getByRole('img', { name: '合成岛友 3的头像暂不可用', exact: true }),
  ).toBeVisible();
  await expect(
    rows.nth(3).getByRole('img', { name: '合成岛友 4暂无头像', exact: true }),
  ).toBeVisible();
  expect((await rows.nth(1).locator('strong').first().boundingBox())!.height).toBeLessThan(30);
  const viewport = panel.locator('[data-radix-scroll-area-viewport]');
  await viewport.hover();
  if (page.viewportSize()!.width <= 760) {
    const box = (await viewport.boundingBox())!,
      x = box.x + 12,
      y = box.y + box.height * 0.8;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - step * 24 }],
      });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
  } else await page.mouse.wheel(0, 240);
  await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const track = viewport.locator('..').locator('[data-orientation="vertical"]');
  await expect(track).toHaveCSS(
    'visibility',
    page.viewportSize()!.width <= 760 ? 'hidden' : 'visible',
  );
  if (page.viewportSize()!.width > 760) await expect(track).toHaveCSS('opacity', '1');
  await assertPetLayout(page);
  await viewport.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(rows.last()).toBeInViewport();
  await assertPetLayout(page);
  await viewport.evaluate((el) => {
    el.scrollTop = 0;
  });
}
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: ranking avatars and compact rows`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        await setupPet(page, skin.id, mode);
        const state = await setupRankings(page);
        const emptyMessages: Record<string, string> = {
          rank: '还没有伙伴上榜。照顾好伙伴，稍后再来看看。',
          boss: '暂无贡献记录。',
          tower: '还没有通关记录，登塔留下你的第一步。',
          tournament: '今日暂无排位记录。',
        };
        for (const kind of ['rank', 'boss', 'tower', 'tournament']) {
          state.hold = true;
          let panel = await openRanking(page, kind);
          await expect(panel.getByText('正在整理营地资料…', { exact: true })).toBeVisible();
          await assertPetLayout(page);
          state.hold = false;
          state.fail = true;
          state.release();
          await expect(panel.getByRole('alert')).toContainText('合成排行读取失败');
          await assertPetLayout(page);
          state.fail = false;
          state.empty = true;
          await panel.getByRole('button', { name: '重试', exact: true }).click();
          await expect(panel.getByText(emptyMessages[kind]!, { exact: true })).toBeVisible();
          await assertPetLayout(page);
          await closeAll(page);
          state.empty = false;
          panel = await openRanking(page, kind);
          await inspectRanking(page, panel);
          if (skin.id === 'wechat')
            await page.screenshot({ path: info.outputPath(`${kind}.png`), fullPage: true });
          if (kind === 'rank') {
            await panel.getByRole('button', { name: '资料', exact: true }).first().click();
            await expect(page.getByRole('dialog', { name: '伙伴资料', exact: true })).toBeVisible();
            await page.keyboard.press('Escape');
            await expect(
              panel.getByRole('button', { name: '资料', exact: true }).first(),
            ).toBeFocused();
          }
          if (kind === 'tournament') {
            await panel.getByRole('button', { name: '挑战排位', exact: true }).first().click();
            const confirm = page.getByRole('dialog', { name: '挑战排位', exact: true });
            await confirm.getByRole('button', { name: '取消', exact: true }).click();
            await expect(
              panel.getByRole('button', { name: '挑战排位', exact: true }).first(),
            ).toBeFocused();
          }
          await closeAll(page);
        }
        // Opening the tournament category first mounts the default companion list.
        expect(state.requests.length).toBe(14);
      });
    }
