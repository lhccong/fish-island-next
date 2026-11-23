import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { shortcutFixture } from './chat-game-shortcuts-fixture';
import { setupChatMenu } from './chat-menu-fixture';
import { setupPetCardCatalog } from './pet-card-catalog-fixture';
import { setupPetCardPlay } from './pet-card-play-fixture';
import { activate, assertPackStock, choosePetCardPack } from './pet-cards-flow';

test.use({ hasTouch: true, reducedMotion: 'reduce', actionTimeout: 10_000 });
test.setTimeout(90_000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`pet card batch ${skin.id} ${mode} ${width}`, async ({ page }, info) => {
        const mobile = width <= 760;
        await page.setViewportSize({ width, height: 844 });
        let fixture: Awaited<ReturnType<typeof setupPetCardPlay>> | undefined;
        const chat = await setupChatMenu(page, skin.id, mode, 'user', async () => {
          await shortcutFixture(page);
          await setupPetCardCatalog(page);
          fixture = await setupPetCardPlay(page, {
            opened: 40,
            level: 10,
            xpToNext: 6,
            stock: [
              { poolId: 'island', quantity: 3, opened: 40 },
              { poolId: 'kingdoms', quantity: 12, opened: 0 },
            ],
            collection: [
              { cardId: 'radish', stars: 1, duplicates: 3, showcased: true, upgradeCost: 1 },
              { cardId: 'fox', stars: 3, duplicates: 4, showcased: false, upgradeCost: 4 },
            ],
          });
        });
        chat.dispose();
        await page.goto('/pet?panel=cards', { waitUntil: 'domcontentloaded' });
        const cards = page.getByRole('dialog', { name: '宠物卡包', exact: true });
        const button = (name: string) => cards.getByRole('button', { name, exact: true });
        await expect(cards.getByText('正在读取宠物卡包…')).toBeVisible({ timeout: 15000 });
        fixture!.releaseState();
        await expect(cards.getByRole('alert')).toContainText('HTTP 503');
        await activate(button('重试'), mobile);

        await activate(button('我的收藏'), mobile);
        const upgrade = button('一键升星');
        await activate(upgrade, mobile);
        const upgradeDialog = page.getByRole('dialog', { name: '一键升星', exact: true });
        await expect(upgradeDialog.getByRole('region', { name: '操作确认内容' })).toContainText(
          '为 2 张卡片合计提升 3 星，消耗 7 张同名重复卡。',
        );
        await activate(upgradeDialog.getByRole('button', { name: '确认', exact: true }), mobile);
        await expect(upgradeDialog).toBeHidden();
        await expect(cards.getByRole('status').filter({ hasText: '合计提升 3 星' })).toContainText(
          '消耗 7 张重复卡',
        );
        await expect(upgrade).toBeDisabled();
        const collection = cards.getByRole('region', { name: '我的卡片' });
        await expect(collection.getByText(/· 4 星/)).toBeVisible();
        await expect(collection.getByText(/· 3 星/)).toBeVisible();

        await activate(button('开卡包'), mobile);
        await assertPackStock(cards, 3);
        const batch = button('批量拆包');
        await activate(batch, mobile);
        const batchDialog = page.getByRole('dialog', { name: '批量拆包', exact: true });
        const picker = batchDialog.getByRole('combobox', { name: '拆包数量' });
        await expect(picker).toContainText('3 包');
        const viewport = batchDialog.getByRole('region', { name: '操作确认内容' });
        const layout = await viewport.evaluate((element) => ({
          overflow: element.scrollWidth - element.clientWidth,
          gutter: getComputedStyle(element).paddingInlineEnd,
        }));
        expect(layout.overflow).toBeLessThanOrEqual(1);
        expect(layout.gutter).toBe(mobile ? '20px' : '24px');
        await activate(picker, mobile);
        if (!mobile) {
          await page.keyboard.press('Escape');
          await expect(picker).toBeFocused();
          await activate(picker, mobile);
        }
        await activate(page.getByRole('option', { name: '2 包', exact: true }), mobile);
        await expect(picker).toContainText('2 包');
        if (skin.id === 'wechat' && (width === 375 || width === 1440)) {
          await batchDialog.screenshot({ path: info.outputPath('batch-open.png') });
        }
        const confirm = batchDialog.getByRole('button', { name: '确认', exact: true });
        await activate(confirm, mobile);
        await expect(batchDialog.getByRole('alert')).toContainText('HTTP 503');
        await activate(confirm, mobile);
        await expect(batchDialog).toBeHidden();
        expect(fixture?.batchIds).toHaveLength(2);
        expect(new Set(fixture?.batchIds).size).toBe(1);
        await assertPackStock(cards, 1);
        await expect(batch).toBeDisabled();
        await expect(cards.getByText('已拆开 2 包，获得 1 张新卡、9 张重复卡。')).toBeVisible();
        await expect(cards.getByText('距升级 4 包')).toBeVisible();
        const body = await cards.getByRole('region', { name: '宠物卡包内容' }).boundingBox();
        const footer = await cards.getByRole('contentinfo').boundingBox();
        expect(body!.y + body!.height).toBeLessThanOrEqual(footer!.y + 1);
        if (skin.id === 'wechat' && (width === 375 || width === 1440)) {
          await cards.screenshot({ path: info.outputPath('batch-result.png') });
        }
        await activate(button('查看开包记录'), mobile);
        await expect(cards.getByRole('alert')).toContainText('HTTP 503');
        await activate(button('重试开包记录'), mobile);
        await expect(cards.getByText('海岛初遇', { exact: true })).toHaveCount(2);
        await expect(cards.getByText('潮汐小蟹', { exact: true })).toBeVisible();

        await activate(button('开卡包'), mobile);
        await choosePetCardPack(cards, '三国群英', mobile);
        await assertPackStock(cards, 12);
        await activate(batch, mobile);
        await expect(picker).toContainText('10 包');
        await activate(picker, mobile);
        await expect(page.getByRole('option')).toHaveCount(9);
        await page.keyboard.press('Escape');
        await activate(batchDialog.getByRole('button', { name: '取消', exact: true }), mobile);
        await expect(batchDialog).toBeHidden();
        await expect(batch).toBeFocused();
      });
    }
