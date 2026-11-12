import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'] as const) {
    test(`${skin.id} ${mode}: payment reserved gutter and keyboard`, async ({
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
      await page.route('**/api/**', (route) =>
        route.fulfill({ json: { code: 0, data: { records: [], total: 0 } } }),
      );
      await page.route('**/api/pay/create', (route) =>
        route.fulfill({ status: 503, body: 'unavailable' }),
      );
      await page.goto('/rank/reward');
      await page.getByRole('button', { name: '打赏支持', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '打赏支持 💗' });
      const region = dialog.getByRole('region', { name: '打赏支持正文' });
      const choice = dialog.getByRole('button', { name: '￥6.6', exact: true });
      await expect(dialog.getByRole('button', { name: '￥29.9', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      if (isMobile) await choice.tap();
      else {
        await choice.focus();
        await page.keyboard.press('Space');
      }
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
      await expect(
        dialog.getByRole('button', { name: '确认打赏 ￥6.6', exact: true }),
      ).toBeEnabled();
      await region.evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.screenshot({ path: info.outputPath('payment-choice.png') });
      const amount = dialog.getByRole('spinbutton', { name: '自定义金额（元）' });
      await amount.fill('0.001');
      await expect(dialog.getByRole('button', { name: '确认打赏 ￥--' })).toBeDisabled();
      await amount.fill('1');
      await expect(choice).toHaveAttribute('aria-pressed', 'false');
      const remark = dialog.getByRole('textbox', { name: '备注（可选）' });
      if (isMobile) await remark.tap();
      else await remark.focus();
      await remark.fill('合成布局验证');
      await expect(remark).toBeFocused();
      const focusGap = await remark.evaluate((el) => {
        const viewport = el.closest('[role="region"]')!.getBoundingClientRect();
        return el.getBoundingClientRect().left - viewport.left;
      });
      expect(focusGap).toBeGreaterThanOrEqual(7);
      for (const part of [0, 0.5, 1]) {
        await region.hover();
        await region.evaluate((el, fraction) => {
          el.scrollTop = fraction * (el.scrollHeight - el.clientHeight);
        }, part);
        const layout = await region.evaluate((el) => {
          const body = el.querySelector('[class*="dialogBody"]')!;
          const viewport = el.getBoundingClientRect();
          const content = body.getBoundingClientRect();
          return {
            overflow: el.scrollWidth - el.clientWidth,
            gap: viewport.right - content.right,
            left: content.left - viewport.left,
          };
        });
        expect(layout.overflow).toBeLessThanOrEqual(1);
        expect(layout.gap).toBeGreaterThanOrEqual(isMobile ? 20 : 24);
        expect(layout.left).toBeGreaterThanOrEqual(0);
        await expect(dialog.getByRole('button', { name: '确认打赏 ￥1' })).toBeInViewport();
        await page.screenshot({ path: info.outputPath(`form-scroll-${part}.png`) });
      }
      await dialog.getByRole('button', { name: '确认打赏 ￥1' }).click();
      await expect(dialog.getByRole('alert')).toContainText('服务暂不可用');
      await expect(dialog.getByRole('alert')).toBeInViewport();
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(page.getByRole('button', { name: '打赏支持', exact: true })).toBeFocused();
    });
  }

test('star menu opens the original repository without changing the current page', async ({
  page,
  context,
}) => {
  await page.route('**/api/**', (route) => route.abort());
  await context.route('https://github.com/lhccong/fish-island-backend', (route) =>
    route.fulfill({ body: '<title>Synthetic destination</title>' }),
  );
  await page.goto('/rank/other');
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page
      .getByRole('navigation', { name: '关于模块' })
      .getByRole('link', { name: '狠狠点个 star' })
      .click(),
  ]);
  await popup.waitForURL('https://github.com/lhccong/fish-island-backend');
  await expect(page).toHaveURL(/\/rank\/other$/);
  await popup.close();
});
