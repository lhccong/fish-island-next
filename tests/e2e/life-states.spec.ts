import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins) {
  test(`${skin.id} game handles empty achievements, corrupt storage and cultivation`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(60_000);
    await page.route('**/api/**', (route) => route.abort());
    await page.addInitScript((id) => {
      localStorage.setItem('fish-island:skin', id);
      localStorage.setItem('life-remake-profile', '{broken');
    }, skin.id);
    await page.goto('/game/life');
    await expect(page.getByRole('status')).toContainText('本地存档无法读取', { timeout: 20_000 });
    await page.getByRole('button', { name: '查看成就', exact: true }).click();
    await page.getByRole('radio', { name: /已解锁/ }).check();
    await expect(page.getByRole('heading', { name: '暂无匹配成就' })).toBeVisible();
    await page.getByRole('button', { name: '查看全部成就', exact: true }).click();
    await page.getByRole('searchbox', { name: '搜索成就' }).fill('不存在的成就查询');
    await expect(page.getByRole('heading', { name: '暂无匹配成就' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('empty-achievements.png'), fullPage: true });
    await page.getByRole('button', { name: '返回首页', exact: true }).click();
    await page.getByRole('button', { name: '立即重开', exact: true }).click();
    await expect(page.getByRole('button', { name: /名人模式/ })).toBeDisabled();
    await page.getByRole('button', { name: /修仙模式/ }).click();
    await page.getByRole('button', { name: '十连抽', exact: true }).click();
    const talents = page.locator('button[aria-pressed]');
    for (let i = 0; i < 3; i++) await talents.nth(i).click();
    await page.getByRole('button', { name: '分配属性', exact: true }).click();
    await page.getByRole('button', { name: '随机分配', exact: true }).click();
    await page.getByRole('button', { name: '踏入仙途', exact: true }).click();
    await expect(page.getByLabel('修行日志')).toContainText('你');
    await page.getByRole('button', { name: '下一年', exact: true }).click();
    await expect(page.getByLabel('修行日志')).toContainText('1岁');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('cultivation.png'), fullPage: true });
  });
}

test('unlocked celebrity mode starts with the original character and talents', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.addInitScript(() =>
    localStorage.setItem(
      'life-remake-profile',
      JSON.stringify({ times: 10, talents: [], events: [], achievements: [] }),
    ),
  );
  await page.goto('/game/life');
  await page.getByRole('button', { name: '立即重开', exact: true }).click();
  await page.getByRole('button', { name: /名人模式/ }).click();
  await page.getByRole('button', { name: '抽取名人', exact: true }).click();
  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: '开始新人生', exact: true }).click();
  await expect(page.getByText('0岁', { exact: true })).toBeVisible();
});

test('failed game chunk offers reload and return actions', async ({ page }) => {
  await page.route('**/src/app/pages/LifeGamePage.tsx*', (route) => route.abort());
  await page.goto('/game/life');
  await expect(page.getByRole('alert')).toContainText('游戏暂时无法打开');
  await expect(page.getByRole('button', { name: '重新加载' })).toBeVisible();
  await page.getByRole('link', { name: '返回游戏目录' }).click();
  await expect(page.getByRole('button', { name: '打开人生重开模拟器', exact: true })).toBeVisible();
});
