import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: duel health and compact equipment ownership`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        await page.route('**/api/pet/cards/art/*', (route) =>
          route.fulfill({ path: 'public/assets/pet/card-art.jpg' }),
        );
        state.duelShowcase = true;
        await page.getByRole('button', { name: /^行囊/ }).click();
        const bag = page.getByRole('dialog', { name: '行囊', exact: true });
        await bag.getByRole('button', { name: '穿戴', exact: true }).first().click();
        await expect(bag.getByRole('button', { name: '卸下', exact: true })).toBeVisible();
        await bag.getByRole('button', { name: '关闭面板' }).click();
        await page.getByRole('button', { name: /^挑战/ }).click();
        const dialog = page.getByRole('dialog', { name: '挑战', exact: true });
        await dialog.getByRole('button', { name: '切磋', exact: true }).click();
        const stage = dialog.locator('[aria-label="挑战演出"]');
        await expect(dialog.getByRole('heading', { name: '伙伴切磋', exact: true })).toBeVisible();
        for (const [side, name] of [
          ['self', '小苔'],
          ['opponent', '栗栗'],
        ]) {
          const panel = stage.locator(`section[data-side="${side}"]`);
          await expect(panel).toContainText(side === 'self' ? '我方' : '对手');
          const gear = panel.getByRole('region', { name: `${name}出战装备` });
          const cards = panel.getByRole('list', { name: `${name}出战卡牌` });
          const buttons = cards.getByRole('button');
          await expect(buttons).toHaveCount(side === 'self' ? 6 : 1);
          await expect(cards.locator('img[data-loaded="true"]').first()).toBeVisible();
          const gearBox = (await gear.boundingBox())!;
          const cardsBox = (await cards.boundingBox())!;
          if (width > 760) expect(cardsBox.x + cardsBox.width).toBeLessThan(gearBox.x);
          else {
            expect(cardsBox.y + cardsBox.height).toBeLessThan(gearBox.y);
            expect((await buttons.last().boundingBox())!.height).toBeGreaterThanOrEqual(44);
          }
          const icon = gear.getByRole('img', { name: '手部：苔纹护腕', exact: true });
          await expect(icon).toBeVisible();
          expect((await icon.boundingBox())!.width).toBe(20);
          await expect(gear.getByRole('img', { name: /未装备$/ })).toHaveCount(5);
          const statusBounds = (await panel.boundingBox())!;
          const fighterBounds = (await stage.locator(`div[data-side="${side}"]`).boundingBox())!;
          expect(statusBounds.y).toBeGreaterThanOrEqual(fighterBounds.y + fighterBounds.height);
          expect(
            Math.abs(
              statusBounds.x + statusBounds.width / 2 - fighterBounds.x - fighterBounds.width / 2,
            ),
          ).toBeLessThan(30);
          expect(await gear.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        }
        const selfCard = stage.getByRole('button', { name: '查看潮月守卫效果' });
        const opponentCard = stage.getByRole('button', { name: '查看极光灵狐效果' });
        const commonCard = stage.getByRole('button', { name: '查看苔光种子 5效果' });
        if (width > 760) {
          await selfCard.hover();
          const tooltip = page.getByRole('tooltip', { name: '潮月守卫效果' });
          await expect(tooltip).toContainText('获得相当于最大生命 20% 的护盾');
          await expect(tooltip).toContainText('生命 +65');
          await expect(tooltip).toBeInViewport({ ratio: 1 });
          if (skin.id === 'wechat')
            await page.screenshot({ path: info.outputPath('duel-card-hover.png') });
          await page.keyboard.press('Escape');
          await expect(tooltip).toHaveCount(0);
          await expect(dialog).toBeVisible();
          await opponentCard.focus();
          await expect(page.getByRole('tooltip', { name: '极光灵狐效果' })).toContainText(
            '首次攻击命中时，100% 暴击',
          );
          await page.keyboard.press('Escape');
        } else {
          await selfCard.tap();
          const detail = page.getByRole('dialog', { name: '潮月守卫效果' });
          await expect(detail).toContainText('获得相当于最大生命 20% 的护盾');
          await expect(detail).toContainText('生命 +65');
          await expect(detail).toBeInViewport({ ratio: 1 });
          if (skin.id === 'wechat')
            await page.screenshot({ path: info.outputPath('duel-card-tap.png') });
          await detail.getByRole('button', { name: '关闭潮月守卫效果' }).tap();
          await expect(detail).toHaveCount(0);
          await expect(selfCard).toBeFocused();
          await opponentCard.tap();
          await expect(page.getByRole('dialog', { name: '极光灵狐效果' })).toContainText(
            '首次攻击命中时，100% 暴击',
          );
          await page.keyboard.press('Escape');
          await expect(opponentCard).toBeFocused();
          await commonCard.tap();
          const common = page.getByRole('dialog', { name: '苔光种子 5效果' });
          await expect(common).toContainText('速度 +5');
          await common.getByRole('button', { name: '关闭苔光种子 5效果' }).tap();
        }
        await assertPetLayout(page);
        if (skin.id === 'wechat') {
          await stage.scrollIntoViewIfNeeded();
          await stage.screenshot({ path: info.outputPath('duel.png') });
        }
        expect(state.battleCount).toBe(0);
        await page.clock.install();
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 60000));
        state.battleEffects = true;
        const start = dialog.getByRole('button', { name: '开始挑战', exact: true });
        if (width <= 760) await start.tap();
        else await start.click();
        await expect(stage.locator('[data-effect="dodge"]')).toBeVisible();
        await page.clock.runFor(900);
        await expect(stage.locator('[data-card-activation="opponent"]')).toContainText(
          '栗栗 · 极光锐爪',
        );
        await expect(stage.locator('[data-card-activation="self"]')).toContainText('潮月守卫');
        await assertPetLayout(page);
        if (skin.id === 'wechat')
          await stage.screenshot({ path: info.outputPath('duel-cards.png') });
        await dialog.getByRole('button', { name: '关闭面板' }).click();

        state.activity.cardBattle = true;
        await page.getByRole('button', { name: /^武道大会/ }).click();
        const tournament = page.getByRole('dialog', { name: '武道大会', exact: true });
        const ranked = page.getByRole('dialog', { name: '武道大会战斗', exact: true });
        const compete = tournament.getByRole('button', { name: '挑战排位' }).first();
        if (width <= 760) await compete.tap();
        else await compete.click();
        await expect(ranked.locator('[data-card-activation="opponent"]')).toContainText('极光灵狐');
        await expect(ranked.locator('[data-card-activation="self"]')).toContainText('潮月守卫');
        await assertPetLayout(page);
        await ranked.getByRole('button', { name: '跳过演出' }).click();
        await ranked.locator('summary').click();
        await expect(ranked.getByRole('list', { name: '战斗回合记录' })).toContainText(
          '栗栗的「极光灵狐」生效，触发极光锐爪。',
        );
        await page.clock.resume();
        await ranked.getByRole('button', { name: '返回榜单' }).click();
        await expect(tournament.getByRole('button', { name: '刷新榜单' })).toBeFocused();
      });
    }
