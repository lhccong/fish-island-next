import { expect, type Locator, type Page } from '@playwright/test';

export async function activate(target: Locator, mobile: boolean) {
  if (mobile) await target.tap();
  else await target.click();
}

export async function assertEqualCardHeights(region: Locator, count: number) {
  const cards = region.locator('[data-grade]');
  await expect(cards).toHaveCount(count);
  const heights = await cards.evaluateAll((elements) =>
    elements.map((element) => (element as HTMLElement).offsetHeight),
  );
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
}

export async function assertCardAbilities(collection: Locator) {
  const common = collection.locator('[data-grade="common"]');
  await expect(common.getByText('对战动作', { exact: true })).toHaveCount(10);
  await expect(common.getByText('闪避', { exact: true })).toHaveCount(5);
  const fine = collection.locator('[data-grade="fine"]');
  await expect(fine.getByText('下一回合开始时，回复最大生命的 6%。')).toHaveCount(10);
  for (const grade of ['epic', 'legendary', 'shiny']) {
    const effects = collection.locator(`[data-grade="${grade}"]`).getByText(/^下一回合/);
    await expect(effects).toHaveCount(10);
    for (const text of await effects.allTextContents()) expect(text).not.toContain('闪避');
  }
}

export async function assertShowcaseEffect(showcase: Locator) {
  const stats = showcase.getByRole('region', { name: '宠物属性加成预览' });
  const effects = showcase.getByRole('region', { name: '对战效果预览' });
  await expect(stats).toContainText('攻击 +36');
  await expect(stats).not.toContainText('极光锐爪');
  await expect(effects).toContainText('极光锐爪 下一回合首次攻击命中时，100% 暴击。');
}

export async function choosePetCardPack(
  page: Page,
  dialog: Locator,
  name: string,
  mobile: boolean,
) {
  const picker = dialog.getByRole('combobox', { name: '选择卡包' });
  await activate(picker, mobile);
  await activate(page.getByRole('option', { name, exact: true }), mobile);
  if (!mobile) await expect(picker).toBeFocused();
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
  await choosePetCardPack(page, dialog, '三国群英', mobile);
  await assertEqualCardHeights(collection, 50);
  await assertCardAbilities(collection);
  const atlases = await collection
    .locator('[data-grade] [aria-hidden="true"][style]')
    .evaluateAll((tiles) => tiles.map((tile) => getComputedStyle(tile).backgroundImage));
  expect(new Set(atlases).size).toBe(5);
  for (const atlas of atlases) expect(atlas).toContain('card-art-three-kingdoms-');
  const cover = collection.getByText('关羽', { exact: true });
  await expect(cover).toBeAttached();
  if (screenshotPath) {
    await cover.evaluate((label) =>
      label.closest('[data-grade]')?.scrollIntoView({ block: 'center' }),
    );
    await dialog.screenshot({ path: screenshotPath });
  }
  await activate(button('开卡包'), mobile);
  await activate(button('领取卡包'), mobile);
  await expect(dialog.getByRole('combobox', { name: '选择卡包' })).toBeDisabled();
  await activate(button('拆开卡包'), mobile);
  await activate(button('全部翻开'), mobile);
  await expect(dialog.getByTestId('shiny-reveal')).toBeVisible();
  await activate(button('继续'), mobile);
  await expect(
    dialog.getByRole('region', { name: '开卡结果' }).getByText('诸葛亮', { exact: true }),
  ).toBeAttached();
  await activate(button('完成开包'), mobile);
  await activate(button('展示柜'), mobile);
  await activate(button('上架诸葛亮'), mobile);
  await expect(showcase).toContainText('诸葛亮');
  await expect(showcase.getByRole('region', { name: '对战效果预览' })).toContainText('八阵图');
  await choosePetCardPack(page, dialog, '海岛初遇', mobile);
  await expect(showcase).toContainText('诸葛亮');
  await expect(collection.getByText('拾贝萝卜', { exact: true })).toBeAttached();
}
