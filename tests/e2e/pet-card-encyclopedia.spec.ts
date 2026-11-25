import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { shortcutFixture } from './chat-game-shortcuts-fixture';
import { setupChatMenu } from './chat-menu-fixture';
import {
  fixtureAtlases,
  fixtureCards,
  fixturePools,
  setupPetCardCatalog,
} from './pet-card-catalog-fixture';
import { setupPetCardPlay } from './pet-card-play-fixture';
import { activate } from './pet-cards-flow';

test.use({ hasTouch: true, reducedMotion: 'reduce' });
test.setTimeout(60_000);

async function verifyScroll(page: Page, viewport: Locator, cards: Locator, mobile: boolean) {
  const track = viewport.locator('..').locator('[data-orientation="vertical"]');
  const layout = await viewport.evaluate((element) => ({
    overflow: element.scrollWidth - element.clientWidth,
    gutter: getComputedStyle(element).paddingInlineEnd,
  }));
  expect(layout.overflow).toBeLessThanOrEqual(1);
  expect(layout.gutter).toBe(mobile ? '20px' : '24px');
  const last = cards.last();
  if (mobile) {
    await expect(track).toHaveCSS('visibility', 'hidden');
    const box = (await viewport.boundingBox())!;
    const touch = await page.context().newCDPSession(page);
    try {
      const x = box.x + 28;
      const y = box.y + box.height * 0.8;
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y }],
      });
      for (let step = 1; step <= 8; step++) {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y - step * 22 }],
        });
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } finally {
      await touch.detach();
    }
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  } else {
    await viewport.hover();
    await expect(track).toHaveCSS('opacity', '1');
    const grid = (await cards.first().locator('..').boundingBox())!;
    expect((await track.boundingBox())!.x - (grid.x + grid.width)).toBeGreaterThanOrEqual(16);
  }
  await viewport.press('End');
  await expect(last).toBeInViewport();
  await viewport.press('Home');
  await expect(cards.first()).toBeInViewport();
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`card encyclopedia ${skin.id} ${mode} ${width}`, async ({ page }, info) => {
        const mobile = width <= 760;
        await page.setViewportSize({ width, height: 844 });
        let releaseState: (() => void) | undefined;
        let releaseArt!: () => void;
        const pendingArt = new Promise<void>((resolve) => {
          releaseArt = resolve;
        });
        let failArt = true;
        let emptyCatalog = false;
        let catalogRequests = 0;
        await setupChatMenu(page, skin.id, mode, 'user', async () => {
          await shortcutFixture(page);
          await setupPetCardCatalog(page);
          await page.route(`**/api/pet/cards/art/${fixtureAtlases[0]!.id}`, async (route) => {
            if (!failArt) return route.fallback();
            await pendingArt;
            return route.fulfill({ status: 404 });
          });
          await page.route('**/api/pet/cards/catalog', (route) => {
            catalogRequests++;
            const cards = fixtureCards.map((card) =>
              card.id === 'radish' ? { ...card, poolIds: ['island', 'kingdoms'] } : card,
            );
            return route.fulfill({
              json: {
                code: 0,
                data: emptyCatalog ? { cards: [], pools: [] } : { cards, pools: fixturePools },
              },
            });
          });
          ({ releaseState } = await setupPetCardPlay(page, {
            stock: [{ poolId: 'island', quantity: 1, opened: 0 }],
          }));
        });
        const cards = page.getByRole('dialog', { name: '宠物卡包', exact: true });
        const button = (name: string) => cards.getByRole('button', { name, exact: true });
        const view = button('图鉴');
        const encyclopedia = cards.getByRole('region', { name: '宠物卡片图鉴' });
        const items = encyclopedia.getByRole('listitem');
        const item = (name: string) => items.filter({ has: page.getByText(name, { exact: true }) });
        const count = encyclopedia.getByRole('status').filter({ hasText: '已收集' });
        const window = page.getByRole('dialog', { name: '伙伴营地', exact: true });
        await activate(
          page
            .getByRole('button', { name: '打开宠物悬浮窗', exact: true })
            .filter({ visible: true }),
          mobile,
        );
        const windowEntry = window.getByRole('button', { name: '宠物卡包', exact: true });
        await activate(windowEntry, mobile);
        await expect(cards.getByText('正在读取宠物卡包…')).toBeVisible();
        releaseState!();
        await expect(cards.getByRole('alert')).toContainText('HTTP 503');
        await activate(button('重试'), mobile);
        await activate(view, mobile);
        await expect(count).toHaveText('已收集 0 / 100');
        await expect(items).toHaveCount(100);
        await expect(encyclopedia.getByText('未收集')).toHaveCount(100);
        const radish = item('拾贝萝卜');
        await expect(radish.getByRole('status')).toHaveText('加载中');
        releaseArt();
        await expect(radish.getByText('缺图')).toBeVisible();
        failArt = false;
        await activate(button('关闭宠物卡包'), mobile);
        await expect(cards).toBeHidden();
        await expect(windowEntry).toBeFocused();

        await page.goto('/pet?panel=cards', { waitUntil: 'domcontentloaded' });
        await activate(button('拆开卡包'), mobile);
        await expect(view).toBeDisabled();
        await activate(button('全部翻开'), mobile);
        await activate(button('继续'), mobile);
        await activate(button('完成开包'), mobile);
        const requestsBefore = catalogRequests;
        if (mobile) {
          expect((await view.boundingBox())!.height).toBeGreaterThanOrEqual(44);
          await view.tap();
        } else {
          await view.press('Enter');
          await expect(view).toBeFocused();
        }
        await expect(view).toHaveAttribute('aria-pressed', 'true');
        expect(
          await cards
            .getByRole('group', { name: '卡包功能' })
            .evaluate((element) => element.scrollWidth - element.clientWidth),
        ).toBeLessThanOrEqual(1);
        await expect(count).toHaveText('已收集 2 / 100');
        const crab = item('潮汐小蟹');
        await expect(radish.locator('img')).toHaveAttribute('data-loaded', 'true');
        await expect(radish.locator('img')).toHaveCSS('filter', 'none');
        await expect(radish.getByText('未收集')).toHaveCount(0);
        await expect(crab.locator('img')).toHaveCSS('filter', 'grayscale(1)');
        await expect(crab.getByText('未收集')).toBeVisible();

        const series = encyclopedia.getByRole('combobox', { name: '图鉴系列' });
        if (!mobile) {
          await series.press('Enter');
          await expect(page.getByRole('listbox', { name: '图鉴系列' })).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(series).toBeFocused();
        }
        await activate(series, mobile);
        await activate(page.getByRole('option', { name: '三国群英', exact: true }), mobile);
        await expect(count).toHaveText('已收集 1 / 51');
        await expect(item('关羽')).toHaveCount(1);
        await expect(crab).toHaveCount(0);
        await expect(series).toBeFocused();
        await activate(series, mobile);
        await activate(page.getByRole('option', { name: '全部系列', exact: true }), mobile);
        await expect(count).toHaveText('已收集 2 / 100');
        expect(catalogRequests).toBe(requestsBefore);
        const viewport = cards.getByRole('region', { name: '宠物卡包内容' });
        await verifyScroll(page, viewport, items, mobile);
        if (
          (skin.id === 'wechat' && mode === 'light' && width === 1440) ||
          (skin.id === 'pixel-island' && mode === 'dark' && width === 375) ||
          (skin.id === 'wps' && mode === 'light' && width === 390)
        ) {
          await cards.screenshot({ path: info.outputPath('encyclopedia.png') });
        }

        const close = button('关闭宠物卡包');
        if (mobile) await close.tap();
        else await page.keyboard.press('Escape');
        await expect(cards).toBeHidden();
        emptyCatalog = true;
        const entry = page
          .getByRole('navigation', { name: '伙伴功能' })
          .getByRole('button', { name: '宠物卡包', exact: true });
        await activate(entry, mobile);
        await expect(cards.getByText('暂无可抽取的卡包。')).toBeVisible();
        await activate(close, mobile);
        await expect(entry).toBeFocused();
      });
    }
