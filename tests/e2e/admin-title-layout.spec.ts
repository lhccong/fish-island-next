import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupAdmin } from './admin-fixture';
for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    test(`${skin.id} ${mode}: title search keeps natural button width`, async ({
      page,
      isMobile,
    }, info) => {
      await setupAdmin(page, skin.id, mode);
      await page.goto('/admin/user', { waitUntil: 'domcontentloaded' });
      await page.getByRole('button', { name: '查看称号', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: '用户称号' });
      const query = dialog.getByRole('button', { name: '查询', exact: true });
      await expect(
        dialog.getByRole('button', { name: '分配 合成称号', exact: true }),
      ).toBeVisible();
      expect(await query.evaluate((el) => getComputedStyle(el).whiteSpace)).toBe('nowrap');
      const buttonBounds = (await query.boundingBox())!;
      expect(buttonBounds.height).toBe(isMobile ? 44 : 32);
      expect(buttonBounds.width).toBeGreaterThanOrEqual(isMobile ? 50 : 48);
      const input = dialog.getByRole('textbox', { name: '搜索称号 ID 或名称', exact: true });
      expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(140);
      await input.fill('合成称号');
      if (isMobile) await query.tap();
      else await query.click();
      await expect(
        dialog.getByRole('button', { name: '分配 合成称号', exact: true }),
      ).toBeVisible();
      expect(
        await dialog
          .getByRole('region', { name: '用户称号列表' })
          .evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath('title-query-fit.png') });
      await dialog.getByRole('button', { name: '关闭用户称号', exact: true }).click();
    });
