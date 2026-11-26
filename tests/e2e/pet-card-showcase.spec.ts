import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { shortcutFixture } from './chat-game-shortcuts-fixture';
import { setupChatMenu } from './chat-menu-fixture';
import { fixtureBonds, fixtureCards, setupPetCardCatalog } from './pet-card-catalog-fixture';
import { setupPetCardPlay } from './pet-card-play-fixture';
import { activate } from './pet-cards-flow';
import { assertPetLayout } from './pet-layout';

test.use({ hasTouch: true, reducedMotion: 'reduce' });
test.setTimeout(90_000);

const candidates = ['radish', 'seahorse', 'frog', 'penguin', 'cloudbird', 'manta', 'jianYong'].map(
  (id) => fixtureCards.find((card) => card.id === id)!,
);
const missingArtKey = `${'f'.repeat(64)}.png`;

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`six-card showcase ${skin.id} ${mode} ${width}`, async ({ page }, info) => {
        const mobile = width <= 760;
        await page.setViewportSize({ width, height: 844 });
        const last = candidates[6]!;
        let missingArt = true;
        let releaseArt!: () => void;
        const holdArt = new Promise<void>((resolve) => {
          releaseArt = resolve;
        });
        let fixture!: Awaited<ReturnType<typeof setupPetCardPlay>>;
        let pet!: Awaited<ReturnType<typeof shortcutFixture>>;
        const chat = await setupChatMenu(page, skin.id, mode, 'user', async () => {
          pet = await shortcutFixture(page, () =>
            fixture.showcasedCards().map(({ cardId, stars }) => {
              const card = candidates.find(({ id }) => id === cardId)!;
              return {
                ...card,
                artKey: missingArt && cardId === last.id ? missingArtKey : card.artKey,
                stars,
                portrait: card.artPortrait,
              };
            }),
          );
          await setupPetCardCatalog(page, fixtureBonds);
          await page.route(`**/api/pet/cards/art/${missingArtKey}`, async (route) => {
            await holdArt;
            await route.fulfill({ status: 503 });
          });
          fixture = await setupPetCardPlay(page, {
            collection: candidates.map(({ id }) => ({
              cardId: id,
              stars: 1,
              duplicates: 1,
              showcased: false,
              upgradeCost: 1,
            })),
          });
        });
        chat.dispose();
        await page.goto('/pet?panel=cards', { waitUntil: 'domcontentloaded' });
        const dialog = page.getByRole('dialog', { name: '宠物卡包', exact: true });
        await expect(dialog.getByRole('status')).toHaveText('正在读取宠物卡包…');
        fixture.releaseState();
        await expect(dialog.getByRole('alert')).toContainText('HTTP 503');
        await activate(dialog.getByRole('button', { name: '重试' }), mobile);
        await activate(dialog.getByRole('button', { name: '我的收藏' }), mobile);

        const shelf = dialog.getByRole('region', { name: '宠物卡片展示柜' });
        const grid = shelf.getByRole('list').first();
        const slots = grid.locator(':scope > li');
        const bonus = shelf.getByRole('region', { name: '宠物战斗属性加成' });
        const bondPanel = shelf.getByRole('region', { name: '卡牌羁绊' });
        const island = bondPanel.getByRole('region', { name: '鱼岛', exact: true });
        const strip = page.locator('ul[aria-label="上架宠物卡片"]');
        const button = (name: string) => dialog.getByRole('button', { name, exact: true });
        const removeAll = shelf.getByRole('button', { name: '一键下架' });
        await expect(removeAll).toBeDisabled();
        await expect(shelf).toContainText('0 / 6');
        await expect(shelf.getByText('空位')).toHaveCount(6);
        await expect(bonus).toHaveCount(0);
        await expect(island).toContainText('0/3');
        await expect(island).toContainText('0/6');
        await expect(island.getByText('吸血率 +4%', { exact: true })).toBeVisible();
        await expect(bondPanel.getByText('已激活', { exact: false })).toHaveCount(0);
        await expect.poll(() => pet.petRequests).toBeGreaterThan(0);
        await expect(strip).toHaveCount(0);
        const before = pet.petRequests;
        const series = dialog.getByRole('combobox', { name: '卡片系列' });
        await activate(series, mobile);
        await activate(page.getByRole('option', { name: '鱼岛（势力）', exact: true }), mobile);
        await expect(series).toHaveText('鱼岛（势力）');
        await expect(button(`上架${last.name}`)).toHaveCount(0);
        if (!mobile) {
          await expect(series).toBeFocused();
          await series.press('Enter');
          await expect(page.getByRole('option', { name: '鱼岛（势力）' })).toHaveAttribute(
            'data-state',
            'checked',
          );
          await page.keyboard.press('Escape');
          await expect(series).toBeFocused();
        }
        await activate(series, mobile);
        await activate(page.getByRole('option', { name: '全部系列', exact: true }), mobile);

        const placed = candidates.slice(0, 6);
        for (const [index, { name }] of placed.entries()) {
          await activate(button(`上架${name}`), mobile);
          await expect(shelf).toContainText(`${index + 1} / 6`);
          const count = index + 1;
          await expect(island).toContainText(count >= 3 ? '3/3 · 已激活' : `${count}/3`);
          await expect(island).toContainText(count === 6 ? '6/6 · 已激活' : `${count}/6`);
        }
        await expect(grid.getByText('鱼岛', { exact: true })).toHaveCount(6);
        await expect(island.getByText('抗吸血 +5%', { exact: true })).toBeVisible();
        await expect(bondPanel.getByRole('region', { name: '吴', exact: true })).toContainText(
          '0/3',
        );
        await expect(bondPanel.getByRole('region', { name: '魏', exact: true })).toContainText(
          '0/3',
        );
        await expect(button(`上架${last.name}`)).toBeDisabled();
        await expect(slots.locator('[data-grade]')).toHaveCount(6);
        const health = placed.reduce((total, card) => total + (card.stats.health ?? 0), 0);
        await expect(bonus).toContainText(`生命 +${health}`);
        await expect.poll(() => pet.petRequests).toBeGreaterThan(before);
        expect(
          await slots.evaluateAll((items) => new Set(items.map((li) => li.offsetTop)).size),
        ).toBe(mobile ? 2 : 1);
        await grid.scrollIntoViewIfNeeded();
        const view = dialog.getByRole('region', { name: '宠物卡包内容' });
        await island.scrollIntoViewIfNeeded();
        const groups = await bondPanel.getByRole('region').evaluateAll((elements) =>
          elements.map((item) => ({
            top: item.getBoundingClientRect().top,
            overflow: item.scrollWidth - item.clientWidth,
          })),
        );
        expect(new Set(groups.map(({ top }) => top)).size).toBe(mobile ? 5 : 2);
        expect(Math.max(...groups.map(({ overflow }) => overflow))).toBeLessThanOrEqual(1);
        const scrollbar = view.locator('..').locator('[data-orientation="vertical"]');
        if (mobile) await expect(scrollbar).toHaveCSS('visibility', 'hidden');
        else {
          await island.hover();
          await expect(scrollbar).toHaveCSS('opacity', '1');
        }
        if (skin.id === 'pixel-island' && (width === 375 || width === 1440)) {
          await island.screenshot({ path: info.outputPath('card-bond.png') });
        }
        await assertPetLayout(page);

        const extra = placed[5]!;
        await activate(shelf.getByRole('button', { name: `下架${extra.name}` }), mobile);
        await expect(island).toContainText('3/3 · 已激活');
        await expect(island).toContainText('5/6');
        await expect(island).not.toContainText('6/6 · 已激活');
        await activate(button(`上架${extra.name}`), mobile);
        await expect(island).toContainText('6/6 · 已激活');

        const first = placed[0]!;
        const upgrade = button(`升星${first.name}，消耗 1 张`);
        await activate(upgrade, mobile);
        const healthIncrease = Math.max(1, Math.floor((first.stats.health ?? 0) / 5));
        await expect(bonus).toContainText(`生命 +${health + healthIncrease}`);
        await expect(strip.locator('li').first()).toHaveAttribute('aria-label', /2 星$/);
        const remove = shelf.getByRole('button', { name: `下架${first.name}` });
        await expect(remove).toHaveCSS('height', mobile ? '44px' : '32px');
        await expect(removeAll).toHaveCSS('height', mobile ? '44px' : '32px');
        if (mobile) await remove.tap();
        else {
          await remove.hover();
          await page.keyboard.press('Tab');
          await remove.focus();
          await expect(remove).toBeFocused();
          await expect(remove).toHaveCSS('outline-width', /^[2-9]px$/);
          await page.keyboard.press('Enter');
          await expect(shelf.getByRole('heading', { name: '宠物卡片展示柜' })).toBeFocused();
        }
        await expect(shelf).toContainText('5 / 6');
        await expect(island).toContainText('3/3 · 已激活');
        await expect(island).toContainText('5/6');
        await expect(island).not.toContainText('6/6 · 已激活');
        await activate(button(`上架${last.name}`), mobile);
        await expect(shelf).toContainText('6 / 6');
        await expect(island).toContainText('5/6');
        await expect(shelf.getByText(last.name, { exact: true })).toBeVisible();
        await expect(bondPanel.getByRole('region', { name: '蜀', exact: true })).toContainText(
          '1/3',
        );
        if (mobile) await activate(button('关闭宠物卡包'), mobile);
        else await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        await expect(strip.locator('li')).toHaveCount(6);
        const lastThumbnail = strip.locator('li').last();
        await expect(lastThumbnail).toHaveAttribute('aria-label', new RegExp(last.name));
        await expect(lastThumbnail.getByRole('status')).toHaveText('加载中');
        releaseArt();
        await expect(lastThumbnail.getByText('缺图')).toBeVisible();
        missingArt = false;
        await page.goto('/pet', { waitUntil: 'domcontentloaded' });
        await strip.scrollIntoViewIfNeeded();
        await expect(strip.locator('img[data-loaded="true"]')).toHaveCount(6);
        const geometry = await strip.evaluate(
          (element, cardSize) => {
            const cards = [...element.children].map((child) => child.getBoundingClientRect());
            const strip = element.getBoundingClientRect();
            return {
              singleRow: cards.every(
                (card) => card.top === cards[0]?.top && card.width <= cardSize,
              ),
              fits: cards.every((card) => card.left >= strip.left && card.right <= strip.right),
              belowPortrait:
                element.previousElementSibling!.getBoundingClientRect().bottom <= strip.top,
              aboveVitals: strip.bottom <= element.nextElementSibling!.getBoundingClientRect().top,
            };
          },
          mobile ? 38 : 44,
        );
        expect(geometry).toEqual({
          singleRow: true,
          fits: true,
          belowPortrait: true,
          aboveVitals: true,
        });
        if (skin.id === 'pixel-island' && (width === 375 || width === 1440)) {
          await page
            .getByRole('region', { name: '伙伴与装备' })
            .screenshot({ path: info.outputPath('companion-cards.png') });
        }
        await page.goto('/pet?panel=cards', { waitUntil: 'domcontentloaded' });
        await activate(button('我的收藏'), mobile);
        const beforeRemoveAll = pet.petRequests;
        await expect(shelf).toContainText('6 / 6');
        if (mobile) await removeAll.tap();
        else {
          await removeAll.hover();
          await removeAll.focus();
          await page.keyboard.press('Enter');
        }
        await expect(dialog.getByText('正在保存…')).toBeVisible();
        await expect(removeAll).toBeDisabled();
        await expect(shelf).toContainText('6 / 6');
        fixture.releaseRemoveAll();
        await expect(dialog.getByRole('alert')).toContainText('HTTP 503');
        await expect(shelf).toContainText('6 / 6');
        await activate(removeAll, mobile);
        await expect(dialog.getByText('已下架全部卡片')).toBeVisible();
        await expect(shelf).toContainText('0 / 6');
        await expect(shelf.getByText('空位')).toHaveCount(6);
        await expect(bonus).toHaveCount(0);
        await expect(island).toContainText('0/6');
        await expect(removeAll).toBeDisabled();
        expect(fixture.removeAllIds).toHaveLength(2);
        expect(new Set(fixture.removeAllIds).size).toBe(1);
        await expect.poll(() => pet.petRequests).toBeGreaterThan(beforeRemoveAll);
        await expect(strip).toHaveCount(0);
        const firstOwned = dialog
          .getByRole('region', { name: '我的卡片' })
          .locator('li')
          .filter({ has: page.getByRole('button', { name: `上架${first.name}`, exact: true }) });
        await expect(firstOwned.locator('[data-card-stars] svg')).toHaveCount(2);
        await assertPetLayout(page);
        await view.evaluate((element) => {
          element.scrollTop = 0;
        });
        if (mobile) {
          const box = (await view.boundingBox())!;
          const x = Math.round(box.x + box.width / 2);
          const y = Math.round(box.y + box.height / 2);
          const touch = await page.context().newCDPSession(page);
          try {
            await touch.send('Input.dispatchTouchEvent', {
              type: 'touchStart',
              touchPoints: [{ x, y }],
            });
            for (const offset of [40, 80, 120, 160]) {
              await touch.send('Input.dispatchTouchEvent', {
                type: 'touchMove',
                touchPoints: [{ x, y: y - offset }],
              });
            }
            await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          } finally {
            await touch.detach();
          }
        } else {
          await view.hover({ position: { x: 90, y: 150 } });
          await page.mouse.wheel(0, 160);
        }
        await expect.poll(() => view.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      });
    }
