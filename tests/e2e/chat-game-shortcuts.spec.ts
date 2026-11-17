import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { shortcutFixture } from './chat-game-shortcuts-fixture';

async function checkScroll(page: Page, region: Locator, width: number) {
  await region.hover();
  const layout = await region.evaluate((element) => {
    const content = element.firstElementChild!.firstElementChild!;
    const track = element.parentElement!.querySelector('[data-orientation="vertical"]');
    return {
      overflow: element.scrollWidth > element.clientWidth,
      gap: element.getBoundingClientRect().right - content.getBoundingClientRect().right,
      track: track ? getComputedStyle(track).visibility : 'hidden',
    };
  });
  expect(layout.overflow).toBe(false);
  expect(layout.gap).toBeGreaterThanOrEqual(width <= 760 ? 20 : 24);
  if (width <= 760) expect(layout.track).toBe('hidden');
  await region.focus();
  await region.press('End');
  await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  if (width > 760) {
    await region.hover();
    await expect(region.locator('..').locator('[data-orientation="vertical"]')).toBeVisible();
  }
  await region.press('Home');
  await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBe(0);
  if (width <= 760) {
    const bounds = (await region.boundingBox())!;
    const session = await page.context().newCDPSession(page);
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height - 40;
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y - step * 40 }],
      });
      await page.waitForTimeout(40);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await session.detach();
    await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.waitForTimeout(500);
  }
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390])
      test.describe(`${skin.id} ${mode} ${width}`, () => {
        test.use({ isMobile: width <= 760 });
        test('聊天快捷浮窗', async ({ page }, info) => {
          test.setTimeout(120000);
          await page.setViewportSize({ width, height: 900 });
          let state!: Awaited<ReturnType<typeof shortcutFixture>>;
          const chat = await setupChatMenu(page, skin.id, mode, 'user', async () => {
            state = await shortcutFixture(page);
          });
          try {
            const draft = page.getByRole('textbox', { name: '消息草稿' });
            await draft.fill('合成测试草稿');
            const click = async (element: Locator) => {
              if (width <= 760) await element.tap();
              else await element.click();
            };
            const farmButton = page
              .getByRole('button', { name: '打开农场悬浮窗', exact: true })
              .filter({ visible: true });
            const petButton = page
              .getByRole('button', { name: '打开宠物悬浮窗', exact: true })
              .filter({ visible: true });
            await expect(page.getByRole('button', { name: '打开我的小岛' })).toHaveCount(0);
            for (const button of [farmButton, petButton]) {
              await expect(button).toBeInViewport();
              await expect(button).toHaveText('');
              const box = (await button.boundingBox())!;
              expect(box.width).toBeGreaterThanOrEqual(44);
              expect(box.height).toBeGreaterThanOrEqual(44);
              await button.focus();
              await page.keyboard.press('Tab');
              await page.keyboard.press('Shift+Tab');
              expect(
                await button.evaluate((element) => getComputedStyle(element).outlineStyle),
              ).not.toBe('none');
            }
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
            if (skin.id === 'wechat')
              await page.screenshot({ path: info.outputPath('header.png') });
            state.farm = 'loading';
            await click(farmButton);
            const farm = page.getByRole('dialog', { name: '摸鱼农场', exact: true });
            await expect(farm.getByText('正在照看田地…')).toBeVisible();
            state.farm = 'error';
            await expect(farm.getByRole('alert')).toContainText('503');
            state.farm = 'empty';
            await click(farm.getByRole('button', { name: '重新加载', exact: true }));
            await expect(farm.getByText('暂时没有地块，请刷新同步农场。')).toBeVisible();
            state.farm = 'ready';
            await click(farm.getByRole('button', { name: '刷新', exact: true }));
            await expect(farm.getByRole('button', { name: /^1号地/ })).toBeVisible();
            await checkScroll(page, farm.getByRole('region', { name: '摸鱼农场内容' }), width);
            await click(farm.getByRole('button', { name: '收起游戏窗口' }));
            await expect(farm).toBeHidden();
            await expect(farmButton).toBeFocused();
            state.pet = 'loading';
            await click(petButton);
            const pet = page.getByRole('dialog', { name: '伙伴营地', exact: true });
            await expect(pet.getByText('正在整理营地资料…')).toBeVisible();
            state.pet = 'error';
            await expect(pet.getByRole('alert')).toContainText('503');
            state.pet = 'empty';
            await click(pet.getByRole('button', { name: '重试', exact: true }));
            await expect(pet.getByRole('heading', { name: '营地正等着第一位伙伴' })).toBeVisible();
            await pet.getByRole('textbox', { name: '新伙伴名字' }).fill('未提交伙伴名字');
            await click(pet.getByRole('button', { name: '收起游戏窗口' }));
            await click(farmButton);
            await expect(farm.getByRole('button', { name: /^1号地/ })).toBeVisible();
            await click(farm.getByRole('button', { name: '收起游戏窗口' }));
            await click(petButton);
            await expect(pet.getByRole('textbox', { name: '新伙伴名字' })).toHaveValue(
              '未提交伙伴名字',
            );
            await click(pet.getByRole('button', { name: '关闭游戏窗口' }));
            await expect(petButton).toBeFocused();
            state.pet = 'ready';
            await click(petButton);
            await expect(pet.getByRole('heading', { name: '合成伙伴 Lv.8' })).toBeVisible();
            await click(pet.getByRole('button', { name: '喂食 · 5 积分' }));
            await expect.poll(() => state.careRequests).toBe(1);
            await expect(pet.getByLabel('饱食', { exact: true })).toHaveAttribute('value', '90');
            await checkScroll(page, pet.getByRole('region', { name: '伙伴营地内容' }), width);
            const requests = {
              farm: state.farmRequests,
              pet: state.petRequests,
              chat: chat.stats(),
            };
            const changeAppearance = async (name: string, colorMode: string) => {
              await click(pet.getByRole('button', { name: '收起游戏窗口' }));
              await click(
                page
                  .getByRole('button', { name: '切换主题', exact: true })
                  .filter({ visible: true })
                  .last(),
              );
              const picker = page.getByRole('dialog', { name: '主题模式' });
              await click(picker.getByRole('button', { name, exact: true }));
              await click(
                picker.getByRole('button', {
                  name: colorMode === 'light' ? '明亮模式' : '暗夜模式',
                  exact: true,
                }),
              );
              await click(picker.getByRole('button', { name: '关闭主题弹窗', exact: true }));
              await click(petButton);
            };
            await changeAppearance(
              skin.id === 'wps' ? '微信绿' : 'WPS 表格',
              mode === 'dark' ? 'light' : 'dark',
            );
            await expect(pet.getByRole('heading', { name: '合成伙伴 Lv.8' })).toBeVisible();
            expect({
              farm: state.farmRequests,
              pet: state.petRequests,
              chat: chat.stats(),
            }).toEqual(requests);
            await changeAppearance(skin.name, mode);
            if (skin.id === 'wechat') await page.screenshot({ path: info.outputPath('pet.png') });
            await page.keyboard.press('Escape');
            await expect(petButton).toBeFocused();
            await expect(draft).toHaveText('合成测试草稿');
            await click(farmButton);
            await click(farm.getByRole('button', { name: '伙伴营地', exact: true }));
            await expect(pet).toBeVisible();
            await expect(page).toHaveURL('/chat');
            await click(pet.getByRole('button', { name: '关闭游戏窗口' }));
            await expect(farmButton).toBeFocused();
            await click(farmButton);
            await click(farm.getByRole('button', { name: '关闭游戏窗口' }));
            await expect(farmButton).toBeFocused();
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
          } finally {
            state.farm = 'ready';
            state.pet = 'ready';
            chat.dispose();
          }
        });
      });
