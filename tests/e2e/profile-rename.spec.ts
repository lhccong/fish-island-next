import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { mockProfile } from './account-profile-fixture';
import { checkProfileScrollGutter } from './profile-scroll-layout';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: rename availability, save feedback and compatibility`, async ({
      page,
    }, info) => {
      await page.clock.setFixedTime(new Date('2026-11-17T12:00:00+08:00'));
      await page.addInitScript(
        ({ skinId, mode }) => {
          localStorage.setItem('fish-island:skin', skinId);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skinId: skin.id, mode },
      );
      const state = await mockProfile(page, mode);
      const user = state.user as typeof state.user & { nextRenameTime?: string | null };
      user.nextRenameTime = null;
      state.holdExtras = true;
      state.extrasFailure = true;
      await page.route('**/api/user/update/my', async (route) => {
        if (!state.fail) user.nextRenameTime = '2026-12-01T00:00:00+08:00';
        await route.fallback();
      });
      await page.goto('/user/login');
      await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-user');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('dialog').getByRole('button', { name: '登录', exact: true }).click();
      const account = page.getByRole('button', { name: '用户菜单', exact: true });
      const dialog = page.getByRole('dialog');
      const openEditor = async () => {
        await account.click();
        await page.getByRole('menuitem', { name: '个人资料与签到', exact: true }).click();
        await dialog.getByRole('button', { name: '修改信息', exact: true }).click();
      };
      await openEditor();
      const hint = page.locator('#profile-name-hint');
      await expect(hint).toContainText('下次可修改时间：现在可修改');
      await expect(dialog.getByRole('status').first()).toBeVisible();
      await checkProfileScrollGutter(page);
      state.holdExtras = false;
      state.releaseExtras();
      await expect(dialog.getByRole('alert').first()).toContainText('合成资料读取失败');
      state.extrasFailure = false;
      await dialog.getByRole('button', { name: '重试称号' }).click();
      await dialog.getByRole('button', { name: '重试会员信息' }).click();
      await expect(dialog.getByRole('alert')).toHaveCount(0);
      const name = dialog.getByRole('textbox', { name: '用户名', exact: true });
      await name.fill('改名测试');
      await expect(name).toHaveAccessibleDescription(/下次可修改时间：现在可修改/);
      state.fail = true;
      await dialog.getByRole('button', { name: '保存修改', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('本月已修改');
      await expect(name).toHaveValue('改名测试');
      state.fail = false;
      state.saving = true;
      await dialog.getByRole('button', { name: '保存修改', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '保存中…', exact: true })).toBeDisabled();
      await expect.poll(() => Boolean(state.releaseSave)).toBe(true);
      state.releaseSave!();
      await expect(dialog.getByRole('status')).toHaveText('个人信息已保存');
      await dialog.getByRole('button', { name: '修改信息', exact: true }).click();
      await expect(hint).toHaveText(
        '首次免费，之后每月限改一次，消耗 100 积分。下次可修改时间：2026-12-01 00:00（北京时间）',
      );
      await checkProfileScrollGutter(page);
      const editor = page.getByRole('region', { name: '个人资料编辑区', exact: true });
      await editor.evaluate((element) => {
        element.scrollTop = 0;
      });
      const hintBox = (await hint.boundingBox())!;
      const nameBox = (await name.boundingBox())!;
      expect(hintBox.y).toBeGreaterThanOrEqual(nameBox.y + nameBox.height);
      expect(await hint.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      await name.focus();
      await expect(name).toBeFocused();
      await page.screenshot({ path: info.outputPath('rename-time.png') });
      await editor.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect(dialog.getByRole('textbox', { name: '被戳后缀', exact: true })).toBeInViewport();
      await editor.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(name).toBeInViewport();
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(account).toBeFocused();
      delete user.nextRenameTime;
      state.emptyExtras = true;
      await page.reload();
      await openEditor();
      await expect(hint).toContainText('下次可修改时间：暂无法获取');
      await expect(dialog.getByRole('region', { name: '会员信息', exact: true })).toContainText(
        '暂无会员信息',
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.keyboard.press('Escape');
    });
  }
