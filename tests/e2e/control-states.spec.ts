import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { mockProfile } from './account-profile-fixture';
import { noOverflow } from './fish-circle-fixture';

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: title failure retains selection and draft`, async ({ page }) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      const state = await mockProfile(page, mode);
      let fail = true;
      await page.route('**/api/user/title/set?*', (route) => {
        if (fail) return route.fulfill({ json: { code: 40000, message: '合成称号保存失败' } });
        state.user.titleId = new URL(route.request().url()).searchParams.get('titleId') ?? '0';
        return route.fulfill({ json: { code: 0, data: true } });
      });
      await page.goto('/user/login');
      await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-user');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('dialog').getByRole('button', { name: '登录', exact: true }).click();
      await page.getByRole('button', { name: '用户菜单', exact: true }).click();
      await page.getByRole('button', { name: '修改信息', exact: true }).click();
      const title = page.getByRole('combobox', { name: '称号设置' });
      const section = page.getByRole('region', { name: '称号设置', exact: true });
      await expect(title).toBeEnabled();
      const draft = page.getByRole('textbox', { name: '个人简介' });
      await draft.fill('称号操作期间保留的草稿');
      await title.click();
      await page.getByRole('option', { name: '摸鱼达人', exact: true }).click();
      await expect(section.getByRole('alert')).toContainText('合成称号保存失败');
      await expect(title).toHaveText('摸鱼监督员');
      await expect(draft).toHaveValue('称号操作期间保留的草稿');
      fail = false;
      await title.press('ArrowDown');
      await page.keyboard.press('End');
      await expect(page.getByRole('option', { name: '摸鱼达人', exact: true })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(title).toHaveText('摸鱼达人');
      await expect(title).toBeFocused();
      await expect(section.getByRole('alert')).toHaveCount(0);
      await expect(draft).toHaveValue('称号操作期间保留的草稿');
      await page.getByRole('button', { name: '取消', exact: true }).click();
      state.emptyExtras = true;
      await page.getByRole('button', { name: '修改信息', exact: true }).click();
      await expect(title).toHaveText('当前称号不可用');
      await title.click();
      await expect(
        page.getByRole('option', { name: '当前称号不可用', exact: true }),
      ).toHaveAttribute('aria-disabled', 'true');
      const list = page.getByRole('listbox', { name: '称号设置' });
      const box = (await list.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      await page.keyboard.press('Escape');
      await expect(title).toBeFocused();
      await expect(page.getByRole('dialog')).toBeVisible();
      await noOverflow(page);
    });
  }
}

for (const mode of ['light', 'dark']) {
  for (const state of ['loading', 'empty', 'error']) {
    test(`wps ${mode} ${state}: filters retain themed panels`, async ({ page }, info) => {
      await page.addInitScript((mode) => {
        localStorage.setItem('fish-island:skin', 'wps');
        localStorage.setItem('fish-island:color-mode', mode);
      }, mode);
      await page.route('**/api/hot/list', (route) => {
        if (state === 'loading') return;
        return route.fulfill(
          state === 'error'
            ? { status: 503, body: 'unavailable' }
            : { json: { code: 0, data: [] } },
        );
      });
      await page.goto('/');
      if (state === 'loading') await expect(page.getByRole('status')).toContainText('正在获取');
      if (state === 'empty')
        await expect(page.getByRole('heading', { name: '暂时没有热榜内容' })).toBeVisible();
      if (state === 'error') await expect(page.getByRole('alert')).toBeVisible();
      for (const [name, option] of [
        ['筛选热榜来源', '全部来源'],
        ['筛选热榜分类', '全部分类'],
      ]) {
        const trigger = page.getByRole('combobox', { name });
        await trigger.click();
        await expect(page.getByRole('option', { name: option, exact: true })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
      }
      await noOverflow(page);
      await page.screenshot({ path: info.outputPath('filter-state.png') });
    });
  }
}
