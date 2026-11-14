import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';
import { finishPetBattle } from './pet-battle-playback';

async function inspectScroll(page: Page) {
  await assertPetLayout(page);
  const dialog = page.getByRole('dialog').last();
  const viewport = dialog.locator('[data-radix-scroll-area-viewport]');
  await viewport.hover();
  await viewport.evaluate((el) => {
    el.scrollTop = 0;
  });
  await assertPetLayout(page);
  const overflow = await viewport.evaluate((el) => el.scrollHeight > el.clientHeight + 1);
  if (overflow) {
    if (page.viewportSize()!.width <= 760) {
      const box = (await viewport.boundingBox())!;
      const cdp = await page.context().newCDPSession(page);
      const x = box.x + 30,
        y = box.y + box.height * 0.8;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      for (let i = 1; i <= 8; i++)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: y - i * 22 }],
        });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await cdp.detach();
    } else await page.mouse.wheel(0, 220);
    await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    const track = viewport.locator('..').locator('[data-orientation="vertical"]');
    await expect(track).toHaveCSS(
      'visibility',
      page.viewportSize()!.width <= 760 ? 'hidden' : 'visible',
    );
    if (page.viewportSize()!.width > 760) await expect(track).toHaveCSS('opacity', '1');
  }
  await viewport.evaluate((el) => {
    el.scrollTop = el.scrollHeight / 2;
  });
  await assertPetLayout(page);
  await viewport.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await assertPetLayout(page);
  const buttons = dialog.getByRole('button');
  await buttons.last().focus();
  await expect(buttons.last()).toBeFocused();
  await assertPetLayout(page);
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: pixel boss and tower adventures`, async ({
        page,
      }, info) => {
        test.setTimeout(120000);
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        state.pet.equippedItems.hand = {
          id: '508',
          quantity: 1,
          enhanceLevel: 7,
          template: {
            id: '40',
            name: '苔纹护腕',
            icon: 'https://camp.test/item.svg',
            description: '合成战斗装备',
            category: 'equipment',
            equipSlot: 'hand',
            rarity: 2,
            baseAttack: 8,
            baseDefense: 4,
            purchasePoint: 20,
          },
        };
        await page.reload();
        await expect(page.getByRole('heading', { name: /小苔/ })).toBeVisible();
        state.holdChallenges = true;
        await page.getByRole('button', { name: /^宠物 Boss/ }).click();
        const dialog = page.getByRole('dialog', { name: '挑战', exact: true });
        await expect(dialog.getByRole('status')).toContainText('正在整理');
        await assertPetLayout(page);
        state.panelFail = true;
        state.holdChallenges = false;
        state.releaseChallenges();
        await expect(dialog.getByRole('alert')).toContainText('读取失败');
        await assertPetLayout(page);
        state.panelFail = false;
        state.panelEmpty = true;
        await dialog.getByRole('button', { name: '重试', exact: true }).click();
        await expect(dialog.getByRole('heading', { name: '首领暂未出现' })).toBeVisible();
        await assertPetLayout(page);
        state.panelEmpty = false;
        await dialog.getByRole('button', { name: '刷新首领' }).click();
        await expect(dialog.getByRole('heading', { name: '林地守卫' })).toBeVisible();
        state.panelFail = true;
        await dialog.getByRole('button', { name: '贡献排行' }).click();
        const ranks = page.getByRole('dialog', { name: '首领贡献排行', exact: true });
        await expect(ranks.getByRole('alert')).toContainText('读取失败');
        state.panelFail = false;
        state.panelEmpty = true;
        await ranks.getByRole('button', { name: '重试', exact: true }).click();
        await expect(ranks.getByText('暂无贡献记录。')).toBeVisible();
        await assertPetLayout(page);
        await page.keyboard.press('Escape');
        state.panelEmpty = false;
        await dialog.getByRole('button', { name: '贡献排行' }).click();
        await expect(ranks.getByText('伤害 125', { exact: true })).toBeVisible();
        await assertPetLayout(page);
        await page.keyboard.press('Escape');
        await expect(dialog.getByRole('button', { name: '贡献排行' })).toBeFocused();
        await dialog.getByRole('button', { name: '开始挑战', exact: true }).click();
        await expect(dialog.getByRole('progressbar', { name: '林地守卫生命' })).toHaveAttribute(
          'aria-valuenow',
          '90',
        );
        const gear = dialog.getByRole('region', { name: '小苔出战装备' });
        await expect(gear.getByRole('img', { name: '手部：苔纹护腕', exact: true })).toBeVisible();
        await expect(gear.getByRole('img', { name: '强化等级 +7', exact: true })).toBeVisible();
        await expect(gear.getByRole('img', { name: /未装备$/ })).toHaveCount(5);
        const gearBounds = (await gear.boundingBox())!;
        const healthBounds = (await dialog
          .getByRole('progressbar', { name: '小苔生命' })
          .boundingBox())!;
        expect(gearBounds.y).toBeGreaterThan(healthBounds.y + healthBounds.height);
        expect(gearBounds.width).toBeLessThan(330);
        if (skin.id === 'wechat') {
          await gear.scrollIntoViewIfNeeded();
          await gear.screenshot({ path: info.outputPath('battle-equipment.png') });
        }
        await inspectScroll(page);
        if (skin.id === 'wechat') {
          await dialog.locator('[data-radix-scroll-area-viewport]').evaluate((el) => {
            el.scrollTop = 0;
          });
          await page.screenshot({ path: info.outputPath('boss-ready.png'), fullPage: true });
        }
        state.failBattle = true;
        await dialog.getByRole('button', { name: '开始挑战', exact: true }).click();
        await expect(dialog.getByRole('alert')).toContainText('挑战次数不足');
        await expect(dialog.getByRole('button', { name: '开始挑战', exact: true })).toBeEnabled();
        state.failBattle = false;
        await dialog.getByRole('button', { name: '开始挑战', exact: true }).click();
        await expect(dialog.getByRole('button', { name: '跳过演出' })).toBeVisible();
        await finishPetBattle(dialog);
        await expect(dialog.getByRole('heading', { name: '挑战胜利', exact: true })).toBeVisible();
        await expect(dialog.getByRole('progressbar', { name: '林地守卫生命' })).toHaveAttribute(
          'aria-valuenow',
          '0',
        );
        const count = state.battleCount;
        const requests = state.requests.length;
        // Open the real appearance controller while a modal is active; the global
        // navigation is intentionally inert/hidden on inner mobile routes.
        await page
          .getByRole('button', { name: '切换主题', exact: true, includeHidden: true })
          .evaluate((element: HTMLButtonElement) => element.click());
        const picker = page.getByRole('dialog', { name: '主题模式' });
        await picker
          .getByRole('button', { name: skin.id === 'wps' ? '微信绿' : 'WPS 表格', exact: true })
          .click();
        await picker
          .getByRole('button', { name: mode === 'light' ? '暗夜模式' : '明亮模式', exact: true })
          .click();
        await expect(
          dialog.getByRole('heading', { name: '挑战胜利', exact: true, includeHidden: true }),
        ).toHaveCount(1);
        await picker.getByRole('button', { name: skin.name, exact: true }).click();
        await picker
          .getByRole('button', { name: mode === 'light' ? '明亮模式' : '暗夜模式', exact: true })
          .click();
        await picker.getByRole('button', { name: '关闭', exact: true }).click();
        expect(state.requests.length).toBe(requests);
        await dialog.getByRole('button', { name: '重播战斗' }).click();
        await finishPetBattle(dialog);
        expect(state.battleCount).toBe(count);
        await dialog.locator('summary').click();
        await expect(
          dialog.getByRole('list', { name: '战斗回合记录' }).getByRole('listitem'),
        ).toHaveCount(3);
        await inspectScroll(page);
        await dialog.getByRole('button', { name: '返回挑战列表' }).click();
        state.bossHealth = 0;
        await dialog.getByRole('button', { name: '刷新首领' }).click();
        await expect(dialog.getByRole('button', { name: '首领已被击败' })).toBeDisabled();
        await assertPetLayout(page);
        await dialog.getByRole('button', { name: '关闭面板' }).click();

        state.holdChallenges = true;
        await page.getByRole('button', { name: /^宠物爬塔/ }).click();
        await expect(dialog.getByRole('status')).toContainText('正在整理');
        state.holdChallenges = false;
        state.panelFail = true;
        state.releaseChallenges();
        await expect(dialog.getByRole('alert')).toContainText('读取失败');
        state.panelFail = false;
        state.towerMissing = true;
        await dialog.getByRole('button', { name: '重试', exact: true }).click();
        await expect(dialog.getByText('暂无下一层守卫资料，请刷新重试。')).toBeVisible();
        await expect(dialog.getByRole('button', { name: '开始试炼' })).toHaveCount(0);
        await inspectScroll(page);
        state.towerMissing = false;
        await dialog.getByRole('button', { name: '刷新进度' }).click();
        await expect(dialog.getByRole('heading', { name: '向第 3 层进发' })).toBeVisible();
        if (skin.id === 'wechat')
          await page.screenshot({ path: info.outputPath('tower.png'), fullPage: true });
        await inspectScroll(page);
        await dialog.getByRole('button', { name: '预览第 3 层' }).click();
        const floor = page.getByRole('dialog', { name: '第 3 层守卫', exact: true });
        await expect(floor.getByRole('heading', { name: '第 3 层守卫', exact: true })).toHaveCount(
          2,
        );
        await assertPetLayout(page);
        await page.keyboard.press('Escape');
        await expect(dialog.getByRole('button', { name: '预览第 3 层' })).toBeFocused();
        await dialog.getByRole('spinbutton', { name: '预览楼层' }).fill('8');
        await dialog.getByRole('button', { name: '查看守卫' }).click();
        await expect(page.getByRole('dialog', { name: '第 8 层守卫', exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        state.panelFail = true;
        await dialog.getByRole('button', { name: '爬塔排行', exact: true }).click();
        const towerRanks = page.getByRole('dialog', { name: '爬塔排行', exact: true });
        await expect(towerRanks.getByRole('alert')).toContainText('读取失败');
        state.panelFail = false;
        state.panelEmpty = true;
        await towerRanks.getByRole('button', { name: '重试', exact: true }).click();
        await expect(towerRanks.getByText('还没有通关记录，登塔留下你的第一步。')).toBeVisible();
        await assertPetLayout(page);
        await page.keyboard.press('Escape');
        state.panelEmpty = false;
        await dialog.getByRole('button', { name: '爬塔排行', exact: true }).click();
        await expect(
          page.getByRole('dialog', { name: '爬塔排行', exact: true }).getByText('合成岛友（我）'),
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await dialog.getByRole('button', { name: '开始试炼' }).click();
        await expect(dialog.getByRole('progressbar', { name: '小苔生命' })).toHaveAttribute(
          'aria-valuenow',
          '920',
        );
        await dialog.getByRole('button', { name: '开始试炼', exact: true }).click();
        await finishPetBattle(dialog);
        await expect(
          dialog.getByText('本次累计伤害 90 · 获得 10 积分', { exact: true }),
        ).toBeVisible();
        await dialog.getByRole('button', { name: '继续试炼' }).click();
        await expect(dialog.getByRole('region', { name: '第 4 层守卫状态' })).toBeVisible();
        state.battleEmpty = true;
        await dialog.getByRole('button', { name: '开始试炼', exact: true }).click();
        await expect(dialog.getByRole('alert')).toContainText('未返回战斗回合');
        await expect(dialog.getByRole('button', { name: '开始试炼', exact: true })).toBeDisabled();
        await assertPetLayout(page);
        await dialog.getByRole('button', { name: '返回挑战列表' }).click();
        await expect(dialog.getByRole('heading', { name: '向第 4 层进发' })).toBeVisible();
        state.towerCompleted = true;
        await dialog.getByRole('button', { name: '刷新进度' }).click();
        await expect(dialog.getByRole('heading', { name: '已登临塔顶' })).toBeVisible();
        await expect(dialog.getByRole('button', { name: '开始试炼' })).toHaveCount(0);
        await inspectScroll(page);
        await dialog.getByRole('button', { name: '关闭面板' }).click();
      });
    }
