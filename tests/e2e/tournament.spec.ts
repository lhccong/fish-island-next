import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

test.setTimeout(120_000);

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: tournament states and challenge`, async ({
        page,
      }, info) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        await setupPet(page, skin.id, mode);
        let fail = false,
          empty = false,
          mine: number | null = 8,
          posts = 0,
          reads = 0;
        let reject = true;
        let release = () => {};
        const held = new Promise<void>((resolve) => {
          release = resolve;
        });
        let releaseChallenge = () => {};
        const heldChallenge = new Promise<void>((resolve) => {
          releaseChallenge = resolve;
        });
        await page.route('**/api/pet/tournament/**', async (route) => {
          const url = new URL(route.request().url());
          if (url.pathname.endsWith('/leaderboard')) {
            reads++;
            if (reads === 1) await held;
            return route.fulfill({
              json: fail
                ? { code: 50000, message: '榜单暂时不可用，请重试' }
                : {
                    code: 0,
                    data: empty
                      ? []
                      : Array.from({ length: 24 }, (_, i) => ({
                          userId: i === 0 ? '124' : i === 7 ? '123' : `${200 + i}`,
                          userName: `合成岛友 ${i + 1}`,
                          userAvatar: '',
                          petName: `伙伴 ${i + 1}`,
                          petUrl: 'https://camp.test/companion.svg',
                          petLevel: 10,
                          rank: i + 1,
                        })),
                  },
            });
          }
          if (url.pathname.endsWith('/my/rank'))
            return route.fulfill({ json: { code: 0, data: mine } });
          expect(route.request().method()).toBe('POST');
          posts++;
          if (posts === 1) await heldChallenge;
          if (reject)
            return route.fulfill({ json: { code: 50000, message: '伙伴状态不足，请恢复后再试' } });
          mine = Number(url.searchParams.get('targetRank'));
          return route.fulfill({
            json: {
              code: 0,
              data: {
                isWin: true,
                myRank: mine,
                rounds: empty
                  ? []
                  : Array.from({ length: 32 }, (_, i) => ({
                      attackerType: 'MY_PET',
                      damage: i + 1,
                      myPetRemainingHealth: 100,
                      opponentPetRemainingHealth: 32 - i,
                    })),
              },
            },
          });
        });
        await page.getByRole('button', { name: /^武道大会/ }).click();
        await expect(page.getByRole('dialog', { name: '武道大会', exact: true })).toBeVisible();
        await expect(page.getByRole('combobox', { name: '挑战分类' })).toHaveCount(0);
        await expect(page.getByText('伙伴切磋', { exact: true })).toHaveCount(0);
        const board = page.getByRole('region', { name: '武道大会', exact: true });
        await expect(board.getByRole('status')).toContainText('正在整理');
        await assertPetLayout(page);
        fail = true;
        release();
        await expect(board.getByRole('alert')).toContainText('榜单暂时不可用');
        await assertPetLayout(page);
        fail = false;
        empty = true;
        mine = null;
        await board.getByRole('button', { name: '重试', exact: true }).click();
        await expect(board.getByText('今日暂无排位记录。', { exact: true })).toBeVisible();
        await expect(board.getByRole('listitem')).toHaveCount(10);
        await assertPetLayout(page);
        await board.getByRole('button', { name: '挑战排位', exact: true }).first().click();
        await expect(page.getByRole('dialog', { name: '挑战排位', exact: true })).toHaveCount(0);
        const battle = page.getByRole('dialog', { name: '武道大会战斗', exact: true });
        await expect(battle.getByRole('status')).toContainText('正在挑战');
        await expect(battle.getByRole('button', { name: '确认', exact: true })).toHaveCount(0);
        await assertPetLayout(page);
        releaseChallenge();
        await expect(battle.getByRole('alert')).toContainText('伙伴状态不足');
        expect(posts).toBe(1);
        await battle.getByRole('button', { name: '返回榜单', exact: true }).click();
        reject = false;
        await board.getByRole('button', { name: '挑战排位', exact: true }).first().click();
        await expect(battle.getByRole('status').filter({ hasText: '挑战胜利' })).toBeVisible();
        await expect(battle.getByText('本次结算未返回战斗回合，以服务端名次为准。')).toBeVisible();
        await assertPetLayout(page);
        await battle.getByRole('button', { name: '返回榜单', exact: true }).click();
        empty = false;
        mine = 8;
        await board.getByRole('button', { name: '刷新榜单', exact: true }).click();
        await expect(board.getByRole('listitem')).toHaveCount(24);
        const rows = board.getByRole('listitem');
        expect(
          await rows.evaluateAll((els) => els.every((el) => el.scrollWidth <= el.clientWidth)),
        ).toBe(true);
        await expect(
          rows.nth(7).getByRole('button', { name: '挑战排位', exact: true }),
        ).toBeDisabled();
        await expect(
          rows.nth(8).getByRole('button', { name: '挑战排位', exact: true }),
        ).toBeDisabled();
        await rows
          .first()
          .getByRole('button', { name: '查看合成岛友 1的伙伴', exact: true })
          .click();
        await expect(page.getByRole('dialog', { name: '伙伴资料', exact: true })).toBeVisible();
        await assertPetLayout(page);
        await page.keyboard.press('Escape');
        await expect(
          rows.first().getByRole('button', { name: '查看合成岛友 1的伙伴', exact: true }),
        ).toBeFocused();
        if (skin.id === 'wechat') await page.screenshot({ path: info.outputPath('board.png') });
        await rows.first().getByRole('button', { name: '挑战排位', exact: true }).click();
        const dialog = battle;
        await expect(dialog.getByLabel('挑战演出', { exact: true })).toBeVisible();
        await dialog.getByRole('button', { name: '跳过演出', exact: true }).click();
        if (skin.id === 'wechat') await page.screenshot({ path: info.outputPath('battle.png') });
        await expect(dialog.getByRole('status').filter({ hasText: '挑战胜利' })).toContainText(
          '当前名次：1',
        );
        await dialog.getByRole('button', { name: '重播战斗', exact: true }).click();
        await dialog.getByRole('button', { name: '跳过演出', exact: true }).click();
        await dialog.getByText('战斗回合记录 · 32 回合', { exact: true }).click();
        const viewport = dialog.locator('[data-radix-scroll-area-viewport]');
        await viewport.hover();
        if (width > 760) await page.mouse.wheel(0, 400);
        else {
          const box = (await viewport.boundingBox())!;
          const cdp = await page.context().newCDPSession(page);
          const x = box.x + box.width / 2,
            y = box.y + box.height * 0.8;
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x, y }],
          });
          for (let step = 1; step <= 8; step++)
            await cdp.send('Input.dispatchTouchEvent', {
              type: 'touchMove',
              touchPoints: [{ x, y: y - step * 24 }],
            });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await cdp.detach();
        }
        await expect.poll(() => viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        const track = viewport.locator('..').locator('[data-orientation="vertical"]');
        await expect(track).toHaveCSS('visibility', width > 760 ? 'visible' : 'hidden');
        await assertPetLayout(page);
        await viewport.evaluate((el) => {
          el.scrollTop = el.scrollHeight;
        });
        await expect(dialog.getByRole('listitem').last()).toBeInViewport();
        await page.keyboard.press('Escape');
        await expect(board.getByRole('button', { name: '刷新榜单', exact: true })).toBeFocused();
        expect(posts).toBe(3);
      });
    }

test('an uncertain tournament submission cannot be resubmitted before checking the board', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await setupPet(page, 'wechat', 'dark');
  let submissions = 0;
  await page.route('**/api/pet/tournament/challenge?*', async (route) => {
    submissions++;
    await route.abort('failed');
  });
  await page.goto('/point/tournament', { waitUntil: 'domcontentloaded' });
  const board = page.getByRole('region', { name: '武道大会', exact: true });
  await board.getByRole('button', { name: '挑战排位', exact: true }).first().click();
  const battle = page.getByRole('dialog', { name: '武道大会战斗', exact: true });
  await expect(battle.getByRole('alert')).toContainText('未能确认挑战结果');
  expect(submissions).toBe(1);
  await battle.getByRole('button', { name: '返回榜单', exact: true }).click();
  await expect(board.getByRole('button', { name: '挑战排位', exact: true }).first()).toBeDisabled();
  await board.getByRole('button', { name: '刷新榜单', exact: true }).click();
  await expect(board.getByText('正在刷新榜单…', { exact: true })).toHaveCount(0);
  await expect(board.getByRole('button', { name: '挑战排位', exact: true }).first()).toBeEnabled();
});

test('switching every theme and color mode preserves tournament state without new requests', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await setupPet(page, 'wechat', 'light');
  let reads = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/pet/tournament/')) reads++;
  });
  await page.goto('/point/tournament', { waitUntil: 'domcontentloaded' });
  const board = page.getByRole('region', { name: '武道大会', exact: true });
  await expect(board.getByRole('listitem')).toHaveCount(10);
  await board.getByRole('button', { name: '挑战排位', exact: true }).first().click();
  const battle = page.getByRole('dialog', { name: '武道大会战斗', exact: true });
  await expect(battle.getByRole('status').filter({ hasText: '挑战胜利' })).toContainText(
    '当前名次：1',
  );
  await battle.getByRole('button', { name: '返回榜单', exact: true }).click();
  await expect(board.getByRole('button', { name: '刷新榜单', exact: true })).toBeEnabled();
  const original = await board.elementHandle();
  const count = reads;
  // The existing camp dialog is modal; activate the global theme trigger to test retained state.
  await page
    .getByRole('button', { name: '切换主题', exact: true, includeHidden: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  const picker = page.getByRole('dialog', { name: '主题模式', exact: true });
  for (const skin of builtinSkins) {
    await picker.getByRole('button', { name: skin.name, exact: true }).click();
    for (const mode of ['暗夜模式', '明亮模式']) {
      await picker.getByRole('button', { name: mode, exact: true }).click();
      await expect(picker.getByRole('button', { name: mode, exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      expect(await original!.evaluate((element) => element.isConnected)).toBe(true);
      expect(reads).toBe(count);
    }
  }
  await page.keyboard.press('Escape');
  await expect(board.getByRole('listitem')).toHaveCount(10);
  await board.getByRole('button', { name: '查看战斗结果', exact: true }).click();
  await expect(battle.getByRole('status').filter({ hasText: '挑战胜利' })).toContainText(
    '当前名次：1',
  );
  await original?.dispose();
});
