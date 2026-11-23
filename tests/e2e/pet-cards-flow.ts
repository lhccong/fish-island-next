import { expect, type Locator, type Page } from '@playwright/test';

export async function activate(target: Locator, mobile: boolean) {
  if (mobile) await target.tap();
  else await target.click();
}

export async function assertEqualCardHeights(cards: Locator, count: number) {
  await expect(cards).toHaveCount(count);
  const heights = await cards.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLElement).offsetHeight),
  );
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
}

export async function assertCollectionSlots(collection: Locator, owned: number) {
  const slots = collection.getByRole('list').first().locator(':scope > li');
  await assertEqualCardHeights(slots.locator(':scope > :first-child'), 50);
  await expect(collection.locator('[data-grade]')).toHaveCount(owned);
  await expect(collection.getByText('未收藏', { exact: true })).toHaveCount(50 - owned);
  await expect(slots.nth(1)).toHaveText('未收藏');
  await expect(slots.nth(1).getByRole('button')).toHaveCount(0);
}

export async function assertShowcaseEffect(showcase: Locator) {
  const stats = showcase.getByRole('region', { name: '宠物属性加成预览' });
  const effects = showcase.getByRole('region', { name: '对战效果预览' });
  await expect(stats).toContainText('攻击 +36');
  await expect(stats).not.toContainText('极光锐爪');
  await expect(effects).toContainText('极光锐爪 下一回合首次攻击命中时，100% 暴击。');
}

export async function choosePetCardPack(dialog: Locator, name: string, mobile: boolean) {
  const carousel = dialog.getByRole('group', { name: '切换卡包' });
  if (!(await carousel.getByText(name, { exact: true }).isVisible())) {
    await activate(carousel.getByRole('button', { name: '下一款卡包' }), mobile);
  }
  await expect(carousel.getByText(name, { exact: true })).toBeVisible();
}

export async function assertPackStock(dialog: Locator, count: number) {
  await expect(dialog.getByRole('group', { name: '切换卡包' })).toContainText(`待拆 ${count} 包`);
}

export async function flipThirdCard(page: Page, dialog: Locator, mobile: boolean) {
  const third = dialog.getByRole('button', { name: '翻开第 3 张卡' });
  if (mobile) await third.tap();
  else {
    await third.focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByRole('button', { name: '翻开下一张' })).toBeFocused();
  }
  await expect(third).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: '翻开第 1 张卡' })).toBeEnabled();
  await expect(dialog.getByText(/试玩积分 5/)).toBeVisible();
}

async function swipePackCover(page: Page, dialog: Locator) {
  const cover = dialog.getByRole('region', { name: '卡包封面' });
  const box = await cover.boundingBox();
  if (!box) throw new Error('Missing card pack cover');
  const cdp = await page.context().newCDPSession(page);
  const x = box.x + box.width * 0.75;
  const y = box.y + 55;
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let index = 1; index <= 7; index++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: x - index * 15, y }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

export async function verifyKingdomsPack(
  page: Page,
  dialog: Locator,
  mobile: boolean,
  screenshotPath?: string,
) {
  const button = (name: string) => dialog.getByRole('button', { name, exact: true });
  const collection = dialog.getByRole('region', { name: '我的卡片' });
  const showcase = dialog.getByRole('region', { name: '宠物卡片展示柜' });
  await choosePetCardPack(dialog, '三国群英', mobile);
  await assertCollectionSlots(collection, 0);
  await expect(collection.getByText('关羽', { exact: true })).toHaveCount(0);
  await activate(button('开卡包'), mobile);
  await choosePetCardPack(dialog, '海岛初遇', mobile);
  await activate(button('领取卡包'), mobile);
  await assertPackStock(dialog, 1);
  if (mobile) {
    await swipePackCover(page, dialog);
    await expect(dialog.getByRole('heading', { name: '三国群英', exact: true })).toBeVisible();
  } else {
    await choosePetCardPack(dialog, '三国群英', mobile);
  }
  await assertPackStock(dialog, 0);
  await activate(button('领取卡包'), mobile);
  await assertPackStock(dialog, 1);
  await expect(button('今日已领完')).toBeDisabled();
  await activate(button('拆开卡包'), mobile);
  await expect(button('下一款卡包')).toBeDisabled();
  await activate(button('翻开第 5 张卡'), mobile);
  await expect(dialog.getByTestId('shiny-reveal')).toBeVisible();
  await activate(button('继续'), mobile);
  await expect(button('翻开第 1 张卡')).toBeEnabled();
  await expect(
    dialog.getByRole('region', { name: '开卡结果' }).getByText('诸葛亮', { exact: true }),
  ).toBeAttached();
  await activate(button('全部翻开'), mobile);
  await activate(button('完成开包'), mobile);
  await activate(button('展示柜'), mobile);
  await assertCollectionSlots(collection, 2);
  const shinyCard = collection.locator('[data-grade="shiny"]');
  await expect(shinyCard).toContainText('诸葛亮');
  const atlas = await shinyCard
    .locator('[aria-hidden="true"][style]')
    .evaluate((tile) => getComputedStyle(tile).backgroundImage);
  expect(atlas).toMatch(/\/api\/pet\/cards\/art\/[a-f0-9]{64}\.jpg/);
  if (screenshotPath) {
    await collection.getByRole('button', { name: '上架蒋琬' }).scrollIntoViewIfNeeded();
    await dialog.screenshot({ path: screenshotPath });
  }
  await activate(button('上架诸葛亮'), mobile);
  await expect(showcase).toContainText('诸葛亮');
  await expect(showcase.getByRole('region', { name: '对战效果预览' })).toContainText('八阵图');
  const previous = button('上一款卡包');
  if (mobile) await previous.tap();
  else {
    await previous.press('Space');
    await expect(previous).toBeFocused();
  }
  await assertPackStock(dialog, 1);
  await expect(showcase).toContainText('诸葛亮');
  await assertCollectionSlots(collection, 0);
  await expect(collection.getByText('拾贝萝卜', { exact: true })).toHaveCount(0);
}
