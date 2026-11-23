import { expect, test, type Locator, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { shortcutFixture } from './chat-game-shortcuts-fixture';
import { setupChatMenu } from './chat-menu-fixture';
import { setupPetCardCatalog } from './pet-card-catalog-fixture';
import { setupPetCardPlay } from './pet-card-play-fixture';
import { activate, assertPackStock, choosePetCardPack } from './pet-cards-flow';

test.use({ hasTouch: true, reducedMotion: 'reduce' });
test.setTimeout(90_000);

async function reachOlderRecords(page: Page, list: Locator, mobile: boolean) {
  if (!mobile) {
    await list.focus();
    await page.keyboard.press('End');
    return;
  }
  const box = (await list.boundingBox())!;
  const x = box.x + box.width / 2;
  const bottom = box.y + box.height - 20;
  const distance = box.height - 42;
  const touch = await page.context().newCDPSession(page);
  try {
    for (let run = 0; run < 8; run++) {
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x, y: bottom }],
      });
      for (let step = 1; step <= 6; step++) {
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: bottom - (distance * step) / 6 }],
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 120));
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      if (await list.getByText('海岛篇旧记录').isVisible()) break;
    }
  } finally {
    await touch.detach();
  }
}

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`formal pet cards ${skin.id} ${mode} ${width}`, async ({ page }, info) => {
        const mobile = width <= 760;
        await page.setViewportSize({ width, height: 844 });
        let fixture: Awaited<ReturnType<typeof setupPetCardPlay>> | undefined;
        const chat = await setupChatMenu(
          page,
          skin.id,
          mode,
          'user',
          async () => {
            await shortcutFixture(page);
            await setupPetCardCatalog(page);
            fixture = await setupPetCardPlay(page);
          },
          true,
          '1',
        );
        await activate(
          page
            .getByRole('button', { name: '打开宠物悬浮窗', exact: true })
            .filter({ visible: true }),
          mobile,
        );
        const pet = page.getByRole('dialog', { name: '伙伴营地', exact: true });
        await activate(pet.getByRole('button', { name: '宠物卡包', exact: true }), mobile);
        const cards = page.getByRole('dialog', { name: '宠物卡包', exact: true });
        const button = (name: string | RegExp) =>
          cards.getByRole('button', { name, exact: typeof name === 'string' });
        await expect(cards.getByText('正在读取宠物卡包…')).toBeVisible();
        fixture!.releaseState();
        await expect(cards.getByRole('alert')).toContainText('HTTP 503');
        await activate(button('重试'), mobile);
        await expect(button(/免费领一包/)).toBeEnabled();
        chat.dispose();

        await page.goto('/pet?panel=cards', { waitUntil: 'domcontentloaded' });
        await expect(button(/免费领一包/)).toBeEnabled({ timeout: 15000 });
        await expect(cards.getByText('首包必有闪耀卡')).toBeVisible();
        await activate(button('我的收藏'), mobile);
        await expect(cards.getByText('开包收藏第一张宠物卡。')).toBeVisible();
        await activate(button('开包记录'), mobile);
        await expect(cards.getByRole('alert')).toContainText('HTTP 503');
        await activate(button('重试开包记录'), mobile);
        await expect(cards.getByText('暂无开包记录。')).toBeVisible();
        await activate(button('开卡包'), mobile);

        await choosePetCardPack(cards, '三国群英', mobile);
        await expect(cards.getByText('首包必有闪耀卡')).toHaveCount(0);
        await expect(cards.getByText('抽卡等级达到 10 级后解锁')).toBeVisible();
        await expect(button('买 1 包 · 100 积分')).toBeDisabled();
        await expect(button(/免费领一包/)).toHaveCount(0);
        await choosePetCardPack(cards, '海岛初遇', mobile);
        await activate(button(/剩 2 次/), mobile);
        await activate(button(/剩 1 次/), mobile);
        await expect(button('今日免费已领完')).toBeDisabled();
        await assertPackStock(cards, 2);

        const buyTen = button('买 10 包 · 450 积分（九折）');
        await activate(buyTen, mobile);
        const order = page.getByRole('dialog', {
          name: '买 10 包 · 450 积分（九折）',
          exact: true,
        });
        await expect(order.getByRole('region', { name: '操作确认内容' })).toContainText(
          '花费 450 积分购买 10 包海岛初遇',
        );
        if (!mobile) {
          await page.keyboard.press('Escape');
          await expect(buyTen).toBeFocused();
          await activate(buyTen, mobile);
        }
        await activate(order.getByRole('button', { name: '确认', exact: true }), mobile);
        await expect(order.getByRole('alert')).toContainText('HTTP 503');
        await activate(order.getByRole('button', { name: '确认', exact: true }), mobile);
        await expect(order).toBeHidden();
        await expect.poll(() => fixture?.requestIds.length).toBe(2);
        expect(new Set(fixture?.requestIds).size).toBe(1);
        await assertPackStock(cards, 12);
        await expect(cards.getByText('可用积分 1,150')).toBeVisible();
        if (skin.id === 'wechat' && (width === 375 || width === 1440)) {
          await cards.screenshot({ path: info.outputPath('formal-card-packs.png') });
        }

        await activate(button('拆开卡包'), mobile);
        await expect(button('翻开第 3 张卡')).toBeEnabled();
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(button('翻开第 3 张卡')).toBeEnabled({ timeout: 15000 });
        if (mobile) await button('翻开第 3 张卡').tap();
        else {
          await button('翻开第 3 张卡').focus();
          await page.keyboard.press('Enter');
          await expect(button('翻开下一张')).toBeFocused();
        }
        await expect(cards.getByText('重复 · 升星材料', { exact: true })).toBeVisible();
        await activate(button('全部翻开'), mobile);
        await expect(cards.getByTestId('shiny-reveal')).toBeVisible();
        await activate(button('继续'), mobile);
        await activate(button('完成开包'), mobile);
        await assertPackStock(cards, 11);
        await expect(cards.getByText('首包必有闪耀卡')).toHaveCount(0);
        await expect(cards.getByText('抽卡等级 Lv.10')).toBeVisible();
        await expect(cards.getByText('距升级 6 包')).toBeVisible();

        await choosePetCardPack(cards, '三国群英', mobile);
        const buyOne = button('买 1 包 · 100 积分');
        await expect(buyOne).toBeEnabled();
        await expect(cards.getByText('首包必有闪耀卡')).toHaveCount(0);
        await activate(buyOne, mobile);
        await activate(
          page
            .getByRole('dialog', { name: '买 1 包 · 100 积分' })
            .getByRole('button', { name: '确认', exact: true }),
          mobile,
        );
        await assertPackStock(cards, 1);

        await activate(button('我的收藏'), mobile);
        const collection = cards.getByRole('region', { name: '我的卡片' });
        const displayCase = cards.getByRole('region', { name: '宠物卡片展示柜' });
        const item = (name: string) =>
          collection.getByRole('listitem').filter({ has: page.getByText(name, { exact: true }) });
        const radish = item('拾贝萝卜');
        const fox = item('极光灵狐');
        const stars = radish.locator('[data-card-stars] svg');
        const displayedStars = displayCase.locator('[data-card-stars] svg');
        await expect(stars).toHaveCount(1);
        await expect(stars.first()).toHaveCSS('fill', 'rgb(255, 196, 77)');
        const life = radish.getByLabel(/生命 \+/);
        const baseLife = Number((await life.getAttribute('aria-label'))?.split('+')[1]);
        const upgrade = (cost: number) =>
          radish.getByRole('button', { name: `升星拾贝萝卜，消耗 ${cost} 张` });
        await expect(radish.getByText('重复卡 3 张')).toBeVisible();
        await expect(upgrade(1)).toContainText('1');
        await expect(upgrade(1).getByText('升星', { exact: true })).toBeVisible();
        await expect(upgrade(1)).toHaveAttribute('title', /消耗 1 张重复卡/);
        const unpin = radish.getByRole('button', { name: '撤下拾贝萝卜' });
        await expect(unpin).toHaveText('撤下');
        await expect(unpin).toHaveCSS('border-top-width', '0px');
        await expect(unpin).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
        if (mobile) await unpin.tap();
        else {
          await unpin.hover();
          await expect(unpin).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
          await upgrade(1).focus();
          await page.keyboard.press('Tab');
          await expect(unpin).toBeFocused();
          await expect(unpin).toHaveCSS('outline-width', '2px');
          await page.keyboard.press('Enter');
        }
        await expect(displayCase.getByText('拾贝萝卜', { exact: true })).toHaveCount(0);
        await activate(radish.getByRole('button', { name: '上架拾贝萝卜' }), mobile);
        await expect(displayCase.getByText('拾贝萝卜', { exact: true })).toBeVisible();
        await activate(upgrade(1), mobile);
        await expect(radish.getByText('重复卡 2 张')).toBeVisible();
        await expect(collection.getByText(/· 2 星/)).toBeVisible();
        await expect(stars).toHaveCount(2);
        await expect(displayedStars).toHaveCount(2);
        if (skin.id === 'wechat' && (width === 375 || width === 1440)) {
          await collection.scrollIntoViewIfNeeded();
          await cards.screenshot({ path: info.outputPath('pet-card-icon-actions.png') });
        }
        await expect(life).toHaveAttribute(
          'aria-label',
          `生命 +${baseLife + Math.max(1, Math.floor(baseLife / 5))}`,
        );
        await activate(upgrade(2), mobile);
        await expect(radish.getByText('重复卡 0 张')).toBeVisible();
        await expect(stars).toHaveCount(3);
        await expect(upgrade(4)).toBeDisabled();
        const buttons = fox.getByRole('button');
        await expect(buttons).toHaveCount(3);
        const sizes = await buttons.evaluateAll((entries) =>
          entries.map((entry) => {
            const { width, height, top } = entry.getBoundingClientRect();
            const icon = entry.querySelector('svg')!.getBoundingClientRect();
            const label = entry.lastElementChild!.getBoundingClientRect();
            return { width, height, top, iconBeforeLabel: icon.bottom <= label.top };
          }),
        );
        expect(sizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
        expect(sizes.every(({ iconBeforeLabel }) => iconBeforeLabel)).toBe(true);
        expect(new Set(sizes.map(({ top }) => top)).size).toBe(1);
        const replay = fox.getByRole('button', { name: '重看极光灵狐特效' });
        await expect(replay).toHaveText('特效');
        await activate(replay, mobile);
        await expect(cards.getByTestId('shiny-reveal')).toBeVisible();
        await activate(button('继续'), mobile);

        await activate(button('开包记录'), mobile);
        const list = cards.getByRole('region', { name: '宠物卡包内容' });
        await expect(list.getByText('拾贝萝卜（重复）').first()).toBeVisible();
        const layout = await list.evaluate((el) => ({
          overflow: el.scrollWidth - el.clientWidth,
          gutter: getComputedStyle(el).paddingInlineEnd,
        }));
        expect(layout.overflow).toBeLessThanOrEqual(1);
        expect(layout.gutter).toBe(mobile ? '20px' : '24px');
        const scrollbar = list.locator('..').locator('[data-orientation="vertical"]');
        if (mobile) await expect(scrollbar).toHaveCSS('visibility', 'hidden');
        else {
          await list.hover();
          await expect(scrollbar).toHaveCSS('opacity', '1');
        }
        if (skin.id === 'wechat' && (width === 375 || width === 1440)) {
          await cards.screenshot({ path: info.outputPath('formal-cards-history.png') });
        }
        await reachOlderRecords(page, list, mobile);
        await expect(list.getByText('海岛篇旧记录')).toBeAttached();
        await expect(list.getByText('已全部加载')).toBeAttached();
        expect(await list.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
        expect(fixture?.historyRequests).toEqual(['', '', '3']);
        if (mobile) {
          await expect
            .poll(() =>
              list.evaluate(async (element) => {
                const top = element.scrollTop;
                await new Promise((resolve) => setTimeout(resolve, 150));
                return top === element.scrollTop;
              }),
            )
            .toBe(true);
        }
        await activate(button('关闭宠物卡包'), mobile);
        await expect(cards).toBeHidden();

        fixture!.prepareLastLevel();
        await activate(page.getByRole('button', { name: '宠物卡包', exact: true }), mobile);
        await expect(cards.getByText('抽卡等级 Lv.59')).toBeVisible();
        await expect(cards.getByText('距升级 1 包')).toBeVisible();
        await activate(button('拆开卡包'), mobile);
        await expect(cards.getByText('抽卡等级 Lv.60')).toBeVisible();
        await expect(cards.getByText('已满级')).toBeVisible();
        await expect(cards.getByText('距升级', { exact: false })).toHaveCount(0);
        await expect(button('翻开第 3 张卡')).toBeEnabled();
        if (skin.id === 'wechat' && (width === 375 || width === 1440)) {
          await cards.screenshot({ path: info.outputPath('pet-cards-level-cap.png') });
        }
      });
    }
