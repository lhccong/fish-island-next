import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupGomoku, act, playPoint } from './gomoku-fixture';
import { drawFixture, drawStroke } from './draw-fixture';
import { landlordsFixture } from './landlords-fixture';
import {
  undercoverFixture,
  closeUndercoverFixture,
  changeAppearance,
  selectValue,
} from './undercover-fixture';

const avatar = 'https://player-assets.test/avatar.svg';
const broken = 'https://player-assets.test/broken.svg';
const longName = '合成岛友🌊一个用于检查窄屏换行的很长很长的玩家昵称';
test.afterEach(async ({ page }) => closeUndercoverFixture(page));
async function images(page: Page) {
  await page.route('https://player-assets.test/**', (route) =>
    route.request().url() === broken
      ? route.fulfill({ status: 404 })
      : route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#59839a"/><circle cx="16" cy="12" r="6" fill="#ffffff"/></svg>',
        }),
  );
}
async function appearance(page: Page, skin: string, mode: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(
    ({ skin, mode }) => {
      localStorage.setItem('fish-island:skin', skin);
      localStorage.setItem('fish-island:color-mode', mode);
    },
    { skin, mode },
  );
}
async function identityLayout(page: Page, expected: number) {
  await expect(page.locator('[data-user-avatar]')).toHaveCount(expected);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const overflow = await page.locator('[data-user-avatar]').evaluateAll((nodes) =>
    nodes.some((node) => {
      const parent = node.parentElement!;
      const box = parent.getBoundingClientRect();
      return (
        parent.scrollWidth > parent.clientWidth + 1 || box.left < -1 || box.right > innerWidth + 1
      );
    }),
  );
  expect(overflow).toBe(false);
}
async function loaded(image: Locator) {
  await expect(image).toBeAttached();
  await expect
    .poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0))
    .toBe(true);
}
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      const label = `${skin.id} ${mode} ${width}`;
      test(`${label} 五子棋身份补读、失败重试与换肤`, async ({ page }, info) => {
        const f = await setupGomoku(page, skin.id, mode, width, '101', avatar);
        await images(page);
        let calls = 0;
        let release = () => {};
        const held = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route('**/api/user/get/vo?*', async (route) => {
          calls++;
          if (calls === 1) {
            await held;
            return route.fulfill({ status: 503, json: {} });
          }
          return route.fulfill({
            json: { code: 0, data: { id: '202', userName: longName, userAvatar: avatar } },
          });
        });
        await act(page, '创建联机房间', width);
        f.created();
        await expect(page.getByText('等待加入', { exact: true })).toBeVisible();
        await identityLayout(page, 2);
        f.joined();
        await expect(
          page.getByRole('status').filter({ hasText: '正在读取对手资料' }),
        ).toBeVisible();
        release();
        await expect(page.getByText('对手资料加载失败', { exact: false })).toBeVisible();
        await act(page, '重试资料', width);
        const room = page.getByRole('region', { name: '当前对局' });
        await expect(room.getByText(longName, { exact: true })).toBeVisible();
        await expect(room.getByText('合成棋手101（你）')).toBeVisible();
        await loaded(room.getByRole('img', { name: `${longName}的头像`, exact: true }));
        await loaded(room.getByRole('img', { name: '合成棋手101的头像', exact: true }));
        await identityLayout(page, 2);
        await playPoint(page, 7, 7, width);
        await expect(page.locator('[data-point="7-7"]')).toHaveAttribute('data-stone', 'black');
        await changeAppearance(
          page,
          skin.id === 'wps' ? '微信绿' : 'WPS 表格',
          mode === 'dark' ? 'light' : 'dark',
        );
        await expect(room.getByText(longName, { exact: true })).toBeVisible();
        expect(calls).toBe(2);
        expect(f.sockets()).toBe(1);
        await changeAppearance(page, skin.name, mode);
        await room.scrollIntoViewIfNeeded();
        if (skin.id === 'moyu-island' || skin.id === 'wps')
          await page.screenshot({ path: info.outputPath('gomoku.png') });
      });

      test(`${label} 你画我猜头像、缺失与图片失败回退`, async ({ page }, info) => {
        await appearance(page, skin.id, mode, width);
        const f = await drawFixture(page);
        await images(page);
        Object.assign(f.state.room.participants[0]!, { userAvatar: avatar, userName: longName });
        Object.assign(f.state.room.participants[1]!, { userAvatar: broken });
        f.state.room.participants.push({
          userId: '789',
          userName: '无头像岛友',
          score: 0,
          hasGuessedCorrectly: false,
        });
        f.state.room.currentPlayers = 3;
        f.state.empty = false;
        f.state.delay = 0;
        await page.goto('/game/draw/synthetic-draw');
        f.releaseFirstLoad();
        await loaded(page.getByRole('img', { name: `${longName}的头像`, exact: true }));
        await expect(page.getByRole('img', { name: '合成猜词玩家的头像占位' })).toBeAttached();
        await expect(page.getByRole('img', { name: '无头像岛友的头像占位' })).toBeAttached();
        await identityLayout(page, 3);
        await act(page, '开始游戏', width);
        await expect(page.getByText('你的题目：苹果', { exact: true })).toBeVisible();
        await drawStroke(page, width <= 760);
        await expect(page.getByText('画作已同步', { exact: true })).toBeVisible();
        await page
          .getByRole('img', { name: `${longName}的头像`, exact: true })
          .scrollIntoViewIfNeeded();
        if (skin.id === 'moyu-island') await page.screenshot({ path: info.outputPath('draw.png') });
        await closeUndercoverFixture(page);
      });

      test(`${label} 谁是卧底玩家身份与触屏投票`, async ({ page }, info) => {
        await appearance(page, skin.id, mode, width);
        const f = await undercoverFixture(page);
        await images(page);
        Object.assign(f.state.room.participants[0]!, { userAvatar: avatar, userName: longName });
        Object.assign(f.state.room.participants[1]!, { userAvatar: broken });
        f.state.phase = 'ready';
        await page.goto('/game/undercover?roomId=synthetic-room');
        const room = page.getByRole('region', { name: '房间信息', exact: true });
        await loaded(room.getByRole('img', { name: `${longName}的头像`, exact: true }));
        await expect(room.getByRole('img', { name: '合成玩家2的头像占位' })).toBeAttached();
        await identityLayout(page, 3);
        await act(page, '开始游戏', width);
        await selectValue(page, '联机投票目标', '合成玩家2');
        await act(page, '提交投票', width);
        await expect(page.getByRole('dialog', { name: '确认投票？' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('button', { name: '提交投票', exact: true })).toBeFocused();
        await act(page, '提交投票', width);
        await act(page, '确认投票', width);
        await expect(page.getByText('本轮已投票，等待结算。')).toBeVisible();
        await room.scrollIntoViewIfNeeded();
        if (skin.id === 'moyu-island')
          await page.screenshot({ path: info.outputPath('undercover.png') });
        await closeUndercoverFixture(page);
      });

      test(`${label} 斗地主本人、对手与大厅头像`, async ({ page }, info) => {
        await appearance(page, skin.id, mode, width);
        const f = await landlordsFixture(page);
        await images(page);
        Object.assign(f.players[0]!, { avatar, userName: longName });
        Object.assign(f.players[1]!, { avatar: broken });
        await page.goto('/game/landlords');
        await expect(page.getByRole('status').filter({ hasText: '正在同步牌桌' })).toBeVisible();
        await expect.poll(() => f.state.commands.includes('gameRoomList')).toBe(true);
        f.releaseRooms();
        await expect(page.getByRole('heading', { name: '还没有房间' })).toBeVisible();
        f.state.fail = true;
        await act(page, '同步房间', width);
        await expect(page.getByRole('alert')).toContainText('合成操作失败');
        f.state.fail = false;
        f.state.rooms = true;
        await act(page, '重试同步', width);
        await loaded(page.getByRole('img', { name: `${longName}的头像`, exact: true }));
        await identityLayout(page, 3);
        await act(page, '加入房间', width);
        await loaded(page.getByRole('img', { name: `${longName}的头像`, exact: true }));
        await expect(page.getByRole('img', { name: '合成牌友2的头像占位' })).toBeAttached();
        await expect(page.getByRole('img', { name: '合成牌友3的头像占位' })).toBeAttached();
        await identityLayout(page, 3);
        await act(page, '准备', width);
        await act(page, '开始游戏', width);
        await act(page, '3 分', width);
        const card = page.getByRole('button', { name: '选择♠3', exact: true });
        await card.scrollIntoViewIfNeeded();
        if (width <= 760) await card.tap();
        else await card.click();
        await expect(card).toHaveAttribute('aria-pressed', 'true');
        await identityLayout(page, 3);
        if (skin.id === 'moyu-island')
          await page.screenshot({ path: info.outputPath('landlords.png') });
        await f.close();
      });
    }
