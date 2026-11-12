import { expect, test, type Page } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup } from './fish-circle-fixture';

test.setTimeout(90_000);
function navigation(page: Page) {
  return page.getByRole('navigation', { name: '发现菜单' }).filter({ visible: true });
}
async function completeMenu(page: Page) {
  const nav = navigation(page);
  if (!(await nav.count())) {
    const about = page.getByRole('navigation', { name: '关于模块' });
    if (await about.count()) await expect(about.getByRole('link')).toHaveCount(5);
    await expect(page.getByRole('link', { name: '返回发现', exact: true })).toBeVisible();
    return;
  }
  await expect(nav.locator(':scope > a, :scope > button')).toHaveCount(5);
  for (const name of ['游戏', '阅读', '伙伴'])
    await expect(nav.getByRole('link', { name, exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: '关于', exact: true })).toBeVisible();
  expect(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function goDiscovery(page: Page, name: string) {
  if (!(await navigation(page).count()))
    await page.getByRole('link', { name: '返回发现', exact: true }).click();
  await navigation(page).getByRole('link', { name, exact: true }).click();
}
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'] as const) {
    test(`${skin.id} ${mode}: discovery stays complete across modules and feed states`, async ({
      page,
      isMobile,
    }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      const state = await setup(page);
      await expect(
        page.getByRole('article', { name: '合成岛友的动态', exact: true }),
      ).toBeVisible();
      await completeMenu(page);
      await page.screenshot({ path: info.outputPath('circle-ready.png') });
      if (!isMobile) {
        await page.getByRole('button', { name: '我的鱼小圈', exact: true }).last().click();
        await expect(
          navigation(page).getByRole('button', { name: '全部动态', exact: true }),
        ).toHaveAttribute('aria-pressed', 'false');
        await navigation(page).getByRole('button', { name: '全部动态', exact: true }).click();
        await expect(
          navigation(page).getByRole('button', { name: '全部动态', exact: true }),
        ).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => state.filter).toBe('');
      }
      state.delay = 1500;
      await page.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByText('正在加载鱼小圈…', { exact: true })).toBeVisible();
      await completeMenu(page);
      await page.screenshot({ path: info.outputPath('circle-loading.png') });
      state.delay = 0;
      await expect(
        page.getByRole('article', { name: '合成岛友的动态', exact: true }),
      ).toBeVisible();
      state.fail = true;
      await page.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await completeMenu(page);
      await page.screenshot({ path: info.outputPath('circle-error.png') });
      state.fail = false;
      state.empty = true;
      await page.getByRole('button', { name: '刷新动态', exact: true }).click();
      await expect(page.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
      await completeMenu(page);
      await page.screenshot({ path: info.outputPath('circle-empty.png') });
      await goDiscovery(page, '关于');
      await expect(
        page.getByRole('navigation', { name: '关于模块' }).getByRole('link'),
      ).toHaveCount(5);
      if (isMobile) await page.getByRole('link', { name: '返回发现', exact: true }).click();
      await goDiscovery(page, '游戏');
      await completeMenu(page);
      if (!isMobile)
        await expect(
          navigation(page).getByRole('link', { name: '游戏', exact: true }),
        ).toHaveAttribute('aria-current', 'page');
      await page.getByRole('button', { name: '打开人生重开模拟器', exact: true }).click();
      await completeMenu(page);
      await page.screenshot({ path: info.outputPath('life-navigation.png') });
      await goDiscovery(page, '阅读');
      await completeMenu(page);
      if (!isMobile)
        await expect(
          navigation(page).getByRole('link', { name: '阅读', exact: true }),
        ).toHaveAttribute('aria-current', 'page');
      await goDiscovery(page, '关于');
      for (const [name, path] of [
        ['赞助榜', '/rank/reward'],
        ['外卖福利', '/rank/welfare'],
        ['共建与反馈', '/rank/about'],
        ['其他产品', '/rank/other'],
      ] as const) {
        await page
          .getByRole('navigation', { name: '关于模块' })
          .getByRole('link', { name, exact: true })
          .click();
        await expect(page).toHaveURL(path);
        await completeMenu(page);
      }
      if (isMobile) await page.getByRole('link', { name: '返回发现', exact: true }).click();
      await goDiscovery(page, '伙伴');
      await expect(page).toHaveURL('/pet');
      await completeMenu(page);
      await page.screenshot({ path: info.outputPath('pet-navigation.png') });
      await goDiscovery(page, '朋友圈');
      await expect(page).toHaveURL('/moments/fish-circle');
      await completeMenu(page);
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
    });
  }
