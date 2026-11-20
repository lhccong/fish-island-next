import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupAdmin } from './admin-fixture';

test.setTimeout(60000);
test.use({ serviceWorkers: 'block' });

test('ordinary users cannot open the big fish settings', async ({ page }) => {
  await setupAdmin(page, 'wechat', 'light', 'user');
  let requests = 0;
  await page.route('**/api/admin/big-fish/settings', (route) => {
    requests++;
    return route.abort();
  });
  await page.goto('/admin/big-fish', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('alert')).toContainText('仅管理员');
  await expect(page.getByRole('switch', { name: '启动大肥鱼' })).toHaveCount(0);
  expect(requests).toBe(0);
});

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode} loads and saves the big fish setting`, async ({ page, isMobile }) => {
      await setupAdmin(page, skin.id, mode);
      let enabled = true;
      let readUnavailable = true;
      let writes = 0;
      let releaseRead!: () => void;
      let releaseWrite!: () => void;
      const pendingRead = new Promise<void>((resolve) => {
        releaseRead = resolve;
      });
      const pendingWrite = new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });
      await page.route('**/api/admin/big-fish/settings', async (route) => {
        expect(route.request().headers()['test-session']).toBe('synthetic-value');
        if (route.request().method() === 'GET') {
          if (readUnavailable) {
            await pendingRead;
            return route.fulfill({ status: 503 });
          }
          return route.fulfill({ json: { code: 0, data: enabled } });
        }
        const { enabled: selection } = route.request().postDataJSON();
        expect(typeof selection).toBe('boolean');
        if (++writes === 1) {
          await pendingWrite;
          return route.fulfill({ json: { code: 40000, message: '合成保存失败' } });
        }
        enabled = selection;
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.goto('/admin', { waitUntil: 'domcontentloaded' });
      const entry = page
        .getByRole('navigation', { name: '管理导航' })
        .filter({ visible: true })
        .getByRole('link', { name: '大肥鱼', exact: true });
      if (isMobile) await entry.tap();
      else await entry.click();
      await expect(page).toHaveURL('/admin/big-fish');
      const settings = page.getByRole('region', { name: '大肥鱼设置' });
      const toggle = settings.getByRole('switch', { name: '启动大肥鱼' });
      const save = settings.getByRole('button', { name: '保存', exact: true });
      const current = settings.getByRole('status').filter({ hasText: '当前' });
      const click = (control: typeof toggle) => (isMobile ? control.tap() : control.click());

      await expect(
        settings.getByRole('status').filter({ hasText: '正在读取设置' }).locator('svg'),
      ).toBeVisible();
      await expect(toggle).toHaveCount(0);
      releaseRead();
      await expect(settings.getByRole('alert')).toContainText('HTTP 503');
      readUnavailable = false;
      await click(settings.getByRole('button', { name: '重试', exact: true }));
      await expect(toggle).toBeChecked();
      await expect(save).toBeDisabled();
      if (isMobile) {
        expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await toggle.tap();
      } else {
        await toggle.press('Space');
      }
      await expect(toggle).not.toBeChecked();
      expect(writes).toBe(0);
      await click(save);
      await expect(settings.getByRole('button', { name: '保存中…' })).toBeDisabled();
      await expect(toggle).toBeDisabled();
      releaseWrite();
      await expect(settings.getByRole('alert')).toHaveText('合成保存失败');
      await expect(toggle).not.toBeChecked();
      await click(save);
      await expect(current).toHaveText('当前已关闭');
      await expect(save).toBeDisabled();

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(toggle).not.toBeChecked();
      await expect(current).toHaveText('当前已关闭');
      await click(toggle);
      await click(save);
      await expect(current).toHaveText('当前已开启');
      expect(writes).toBe(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
}
