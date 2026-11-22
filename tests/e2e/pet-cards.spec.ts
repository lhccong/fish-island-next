import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import {
  activate,
  assertCardAbilities,
  assertEqualCardHeights,
  assertShowcaseEffect,
  choosePetCardPack,
  verifyKingdomsPack,
} from './pet-cards-flow';
import { setupPet } from './pet-fixture';

async function assertLayout(viewport: Locator) {
  const layout = await viewport.evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      overflow: element.scrollWidth - element.clientWidth,
      gutter: Number.parseFloat(css.paddingInlineEnd),
    };
  });
  expect(layout.overflow).toBeLessThanOrEqual(1);
  return layout.gutter;
}

async function scrollByTouch(page: Page, viewport: Locator) {
  const bounds = await viewport.boundingBox();
  if (!bounds) throw new Error('Missing card viewport');
  const cdp = await page.context().newCDPSession(page);
  const x = bounds.x + 28;
  const y = bounds.y + bounds.height * 0.8;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let step = 1; step <= 8; step++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - step * 22 }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await viewport.evaluate(
    (element) =>
      new Promise<void>((resolve) => {
        let still = 0;
        let previous = element.scrollTop;
        function settle() {
          const next = element.scrollTop;
          still = next === previous ? still + 1 : 0;
          previous = next;
          if (still >= 8) resolve();
          else requestAnimationFrame(settle);
        }
        requestAnimationFrame(settle);
      }),
  );
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`pet cards ${skin.id} ${mode} ${width}`, async ({ page }, info) => {
        const mobile = width <= 760;
        await page.setViewportSize({ width, height: mobile ? 844 : 960 });
        const camp = await setupPet(page, skin.id, mode);
        await page.evaluate(() => {
          Math.random = () => 0;
          const open = IDBFactory.prototype.open;
          const success = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'onsuccess');
          let holdFirstLoad = true;
          IDBFactory.prototype.open = function (...args) {
            const request = open.apply(this, args);
            if (holdFirstLoad && args[0] === 'fish-island-pet-cards') {
              holdFirstLoad = false;
              Object.defineProperty(request, 'onsuccess', {
                set(handler: (event: Event) => void) {
                  success?.set?.call(request, (event: Event) => {
                    window.addEventListener(
                      'pet-card-test-load',
                      () => handler.call(request, event),
                      { once: true },
                    );
                  });
                },
              });
            }
            return request;
          };
          const put = IDBObjectStore.prototype.put;
          let failOnce = true;
          IDBObjectStore.prototype.put = function (...args) {
            if (failOnce && this.name === 'albums') {
              failOnce = false;
              throw new DOMException('Synthetic save failure', 'QuotaExceededError');
            }
            return put.apply(this, args);
          };
        });
        const entry = page.getByRole('button', { name: '宠物卡包', exact: true });
        await activate(entry, mobile);
        const dialog = page.getByRole('dialog', { name: '宠物卡包试玩' });
        const viewport = dialog.getByRole('region', { name: '宠物卡包内容' });
        const button = (name: string) => dialog.getByRole('button', { name, exact: true });
        const showcase = dialog.getByRole('region', { name: '宠物卡片展示柜' });
        await expect(dialog.getByRole('status')).toContainText('正在读取宠物卡包');
        await expect
          .poll(() =>
            page.evaluate(() => {
              // The success event may still be queued while the loading indicator is visible.
              window.dispatchEvent(new Event('pet-card-test-load'));
              return document.body.textContent?.includes('今日可领');
            }),
          )
          .toBe(true);
        await expect(dialog.getByText(/今日可领 2 \/ 2/)).toBeVisible();
        expect(await assertLayout(viewport)).toBe(mobile ? 20 : 24);
        if (
          skin.id === 'pixel-island' &&
          ((mode === 'dark' && width === 375) || (mode === 'light' && width === 1440))
        ) {
          await dialog.screenshot({ path: info.outputPath('sealed-pack.png') });
        }
        await activate(button('展示柜'), mobile);
        await expect(dialog.getByText('开包收藏第一张宠物卡。')).toBeVisible();
        await activate(button('开卡包'), mobile);
        await activate(button('领取卡包'), mobile);
        await expect(dialog.getByRole('alert')).toContainText('保存试玩进度失败');
        await expect(dialog.getByText(/今日可领 2 \/ 2/)).toBeVisible();
        await activate(button('领取卡包'), mobile);
        await expect(dialog.getByText(/今日可领 1 \/ 2/)).toBeVisible();
        await activate(button('拆开卡包'), mobile);
        await expect(button('翻开下一张')).toBeEnabled();
        if (mobile) await button('翻开下一张').tap();
        else {
          await button('翻开下一张').focus();
          await expect(button('翻开下一张')).toBeFocused();
          await page.keyboard.press('Enter');
        }
        await expect(dialog.getByText('新收藏', { exact: true })).toHaveCount(1);
        if (mode === 'dark') {
          for (let index = 1; index < 5; index++) await activate(button('翻开下一张'), mobile);
        } else {
          await activate(button('全部翻开'), mobile);
        }
        const shiny = dialog.getByTestId('shiny-reveal');
        await expect(shiny).toBeVisible();
        expect(
          await shiny.evaluate((element) =>
            element
              .getAnimations({ subtree: true })
              .some((animation) => Number(animation.effect?.getTiming().duration) >= 900),
          ),
        ).toBe(true);
        const area = await viewport.boundingBox();
        const effect = await shiny.boundingBox();
        expect(Math.abs((area?.y ?? 0) - (effect?.y ?? 0))).toBeLessThan(10);
        if (skin.id === 'pixel-island' && mode === 'dark' && width === 375) {
          await dialog.screenshot({ path: info.outputPath('shiny-reveal.png') });
        }
        await activate(button('继续'), mobile);
        await expect(dialog.getByText('重复卡已分解，获得 15 试玩积分')).toBeAttached();
        await expect(dialog.getByText('闪耀', { exact: true })).toBeAttached();
        await expect(dialog.getByText('攻击 +36', { exact: true })).toBeAttached();
        await expect(dialog.getByText('下一回合首次攻击命中时，100% 暴击。')).toBeAttached();
        const backgrounds = await dialog
          .getByText('极光锐爪', { exact: true })
          .evaluate((label) => {
            const passive = label.parentElement;
            const stats = passive?.nextElementSibling;
            if (!passive || !stats) throw new Error('Missing card material');
            return {
              passive: getComputedStyle(passive).backgroundColor,
              stats: getComputedStyle(stats).backgroundColor,
            };
          });
        expect(backgrounds.passive).toBe(backgrounds.stats);
        expect(backgrounds.passive).not.toBe('rgb(255, 255, 255)');
        await assertEqualCardHeights(dialog.getByRole('region', { name: '开卡结果' }), 5);
        expect(await assertLayout(viewport)).toBe(mobile ? 20 : 24);
        if (
          skin.id === 'pixel-island' &&
          ((mode === 'dark' && width === 375) || (mode === 'light' && width === 1440))
        ) {
          await dialog.screenshot({ path: info.outputPath('opened-pack.png') });
        }
        await activate(button('完成开包'), mobile);
        await activate(button('展示柜'), mobile);
        await expect(showcase).toContainText('0 / 3');
        const collection = dialog.getByRole('region', { name: '我的卡片' });
        await assertEqualCardHeights(collection, 50);
        await assertCardAbilities(collection);
        const atlases = await collection
          .locator('[data-grade] [aria-hidden="true"][style]')
          .evaluateAll((tiles) => tiles.map((tile) => getComputedStyle(tile).backgroundImage));
        expect(new Set(atlases).size).toBe(5);
        for (const atlas of new Set(atlases))
          expect(atlases.filter((image) => image === atlas)).toHaveLength(10);
        const metallicColors = await collection
          .locator('[data-grade="legendary"], [data-grade="shiny"]')
          .evaluateAll((cards) =>
            cards.map((card) => getComputedStyle(card).getPropertyValue('--card-metal').trim()),
          );
        expect(new Set(metallicColors).size).toBe(2);
        const shinyRims = await collection
          .locator('[data-grade="shiny"]')
          .evaluateAll((cards) => cards.map((card) => getComputedStyle(card).backgroundImage));
        expect(shinyRims).toHaveLength(10);
        for (const rim of shinyRims) expect(rim).toContain('conic-gradient');
        if (
          skin.id === 'pixel-island' &&
          ((mode === 'light' && width === 1440) || (mode === 'dark' && width === 375))
        ) {
          await collection.getByText('星轨蝶灵', { exact: true }).evaluate((label) => {
            label.closest('[data-grade]')?.scrollIntoView({ block: 'center' });
          });
          await dialog.screenshot({ path: info.outputPath('equal-height-cards.png') });
          await viewport.evaluate((element) => {
            element.scrollTop = 0;
          });
        }
        const track = viewport.locator('..').locator('[data-orientation="vertical"]');
        if (!mobile) {
          await viewport.hover();
          await expect(track).toBeVisible();
          await expect(track).toHaveCSS('opacity', '1');
        }
        await activate(button('上架拾贝萝卜'), mobile);
        await expect(showcase).toContainText('拾贝萝卜');
        await activate(button('撤下拾贝萝卜'), mobile);
        await expect(showcase).toContainText('0 / 3');
        await activate(button('上架极光灵狐'), mobile);
        await expect(showcase).toContainText('极光灵狐');
        await assertShowcaseEffect(showcase);
        expect(await assertLayout(viewport)).toBe(mobile ? 20 : 24);
        if (mobile) await activate(button('关闭宠物卡包'), true);
        else await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(entry).toBeFocused();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.evaluate(() => {
          Math.random = () => 0;
        });
        await activate(entry, mobile);
        await activate(button('展示柜'), mobile);
        await expect(showcase).toContainText('极光灵狐');
        await activate(button('开卡包'), mobile);
        await activate(button('领取卡包'), mobile);
        await expect(dialog.getByText(/今日可领 0 \/ 2/)).toBeVisible();
        await activate(button('拆开卡包'), mobile);
        await activate(button('全部翻开'), mobile);
        await expect(dialog.getByText('重复卡已分解，获得 25 试玩积分')).toBeAttached();
        await activate(button('完成开包'), mobile);
        await expect(button('今日已领完')).toBeDisabled();
        await expect(dialog.getByText(/试玩积分 40/)).toBeVisible();
        if (!mobile) {
          const picker = dialog.getByRole('combobox', { name: '选择卡包' });
          await picker.focus();
          await page.keyboard.press('Space');
          await expect(page.getByRole('option', { name: '三国群英', exact: true })).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(picker).toBeFocused();
        }
        await choosePetCardPack(page, dialog, '三国群英', mobile);
        await expect(dialog.getByRole('heading', { name: '三国群英', exact: true })).toBeVisible();
        await expect(button('今日已领完')).toBeDisabled();
        const reset = button('恢复初始状态');
        await activate(reset, mobile);
        const confirmation = page.getByRole('dialog', { name: '恢复初始状态', exact: true });
        await expect(confirmation).toContainText('恢复今天的两次领取机会');
        await activate(confirmation.getByRole('button', { name: '取消', exact: true }), mobile);
        await expect(reset).toBeFocused();
        await expect(dialog.getByText(/试玩积分 40/)).toBeVisible();
        await activate(reset, mobile);
        await activate(confirmation.getByRole('button', { name: '确认', exact: true }), mobile);
        await expect(dialog.getByText('已恢复试玩初始状态。')).toBeVisible();
        await expect(reset).toBeFocused();
        await expect(dialog.getByText(/今日可领 2 \/ 2/)).toBeVisible();
        await expect(dialog.getByText(/收藏 0 \/ 50/)).toBeVisible();
        await expect(dialog.getByText(/试玩积分 0/)).toBeVisible();
        await expect(dialog.getByText('首包必有闪耀卡')).toBeVisible();
        await activate(button('展示柜'), mobile);
        await expect(showcase).toContainText('0 / 3');
        await expect(dialog.getByText('开包收藏第一张宠物卡。')).toBeVisible();
        const captureKingdoms =
          skin.id === 'pixel-island' &&
          ((mode === 'light' && width === 1440) || (mode === 'dark' && width === 375));
        await verifyKingdomsPack(
          page,
          dialog,
          mobile,
          captureKingdoms ? info.outputPath('three-kingdoms-cards.png') : undefined,
        );
        expect(camp.requests.filter((request) => request.includes('card'))).toEqual([]);
        if (mobile) {
          await scrollByTouch(page, viewport);
          await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
          await expect(track).toHaveCSS('visibility', 'hidden');
        }
      });
    }
