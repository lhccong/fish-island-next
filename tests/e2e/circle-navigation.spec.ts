import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setup, noOverflow, post } from './fish-circle-fixture';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: circle cover return and discovery title`, async ({ page }, info) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      const state = await setup(page, false, { visual: true });
      const mobile = (page.viewportSize()?.width ?? 1280) <= 760;
      const cover = page.getByRole('region', { name: '鱼小圈封面' });
      const back = page.getByRole('button', { name: '返回发现', exact: true });
      const assertLayout = async () => {
        await noOverflow(page);
        if (mobile) {
          await expect(page.locator('header')).toBeHidden();
          await expect(back).toBeVisible();
          await expect(page.getByRole('link', { name: '返回发现', exact: true })).toBeHidden();
          const box = (await cover.boundingBox())!;
          const button = (await back.boundingBox())!;
          expect(box.y).toBeLessThan(24);
          expect(button.x - box.x).toBeGreaterThanOrEqual(4);
          expect(button.x - box.x).toBeLessThanOrEqual(16);
          expect(button.y - box.y).toBeLessThanOrEqual(16);
          expect(button.width).toBeGreaterThanOrEqual(44);
          expect(button.height).toBeGreaterThanOrEqual(44);
          const actions = (await cover.getByRole('button', { name: '全部动态' }).boundingBox())!;
          expect(button.x + button.width + 4).toBeLessThanOrEqual(actions.x);
          await back.focus();
          await expect(back).toBeFocused();
        } else {
          await expect(page.getByRole('heading', { name: '鱼小圈', exact: true })).toBeVisible();
          await expect(back).toBeHidden();
        }
      };
      await expect(page.getByRole('article').getByText(state.text, { exact: true })).toBeVisible();
      await assertLayout();
      await page.screenshot({ path: info.outputPath('circle-success.png') });
      state.delay = 700;
      await page.getByRole('button', { name: '刷新动态' }).click();
      await expect(page.getByText('正在加载鱼小圈…')).toBeVisible();
      await assertLayout();
      await expect(page.getByRole('article').getByText(state.text, { exact: true })).toBeVisible();
      state.delay = 0;
      state.fail = true;
      await page.getByRole('button', { name: '刷新动态' }).click();
      await expect(page.getByRole('alert')).toBeVisible();
      await assertLayout();
      state.fail = false;
      state.empty = true;
      await page.getByRole('button', { name: '重试动态' }).click();
      await expect(page.getByText('还没有动态，分享第一条摸鱼日常吧')).toBeVisible();
      await assertLayout();
      state.empty = false;
      state.visual = false;
      state.text = post.content;
      await page.getByRole('button', { name: '我的鱼小圈', exact: true }).click();
      await expect(page.getByRole('button', { name: '返回全部动态' })).toBeVisible();
      await expect(back).toHaveCount(0);
      await page.getByRole('button', { name: '返回全部动态' }).click();
      await expect(
        page.getByRole('article').getByText(post.content, { exact: true }),
      ).toBeVisible();
      if (mobile) await back.tap();
      else await page.goto('/discover');
      await expect(page).toHaveURL('/discover');
      await expect(page.getByRole('heading', { name: '发现', exact: true })).toHaveCount(
        mobile ? 1 : 2,
      );
      await expect(page.getByRole('heading', { name: '发现', level: 1 })).toBeVisible();
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('discovery.png') });
      if (mobile) await page.getByRole('link', { name: '朋友圈', exact: true }).tap();
      else await page.getByRole('link', { name: '朋友圈', exact: true }).click();
      await expect(
        page.getByRole('article').getByText(post.content, { exact: true }),
      ).toBeVisible();
      await assertLayout();
    });
  }
