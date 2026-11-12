import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { defaultAvatars } from '../../src/features/auth/default-avatars';
import { mockProfile } from './account-profile-fixture';
import { checkProfileScrollGutter, checkProfileScrollLayout } from './profile-scroll-layout';
import { checkProfileButtons } from './profile-button-style';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: complete legacy profile`, async ({ page }, info) => {
      test.setTimeout(90_000);
      await page.addInitScript(
        ({ skinId, mode }) => {
          localStorage.setItem('fish-island:skin', skinId);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skinId: skin.id, mode },
      );
      const state = await mockProfile(page, mode);
      await page.goto('/user/login');
      await page.getByRole('textbox', { name: '账号或邮箱', exact: true }).fill('synthetic-user');
      await page.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await page.getByRole('dialog').getByRole('button', { name: '登录', exact: true }).click();
      const account = page.getByRole('button', { name: '用户菜单', exact: true });
      await expect(account).toBeVisible();
      if (skin.id !== 'wps') {
        await page.getByRole('button', { name: '查看资料测试热榜消息', exact: true }).click();
        await page.getByRole('textbox', { name: '消息输入框' }).fill('编辑资料保留草稿');
      }
      const before = state.hotRequests;
      await account.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('还没有填写个人简介');
      await dialog.getByRole('button', { name: '修改信息', exact: true }).click();
      await dialog.getByRole('textbox', { name: '用户名', exact: true }).fill('取消的修改');
      await dialog.getByRole('button', { name: '取消', exact: true }).click();
      await expect(dialog).toContainText('合成岛友');
      expect(state.updates).toBe(0);
      state.holdExtras = true;
      state.extrasFailure = true;
      await dialog.getByRole('button', { name: '修改信息', exact: true }).click();
      const titles = dialog.getByRole('region', { name: '称号设置', exact: true });
      const member = dialog.getByRole('region', { name: '会员信息', exact: true });
      await expect(titles.getByRole('status')).toHaveText('正在读取称号…');
      await expect(member.getByRole('status')).toHaveText('正在读取会员信息…');
      await checkProfileScrollGutter(page);
      await page.screenshot({ path: info.outputPath('profile-loading.png') });
      state.holdExtras = false;
      state.releaseExtras();
      await expect(titles.getByRole('alert')).toContainText('合成资料读取失败');
      await expect(member.getByRole('alert')).toContainText('合成资料读取失败');
      state.extrasFailure = false;
      await titles.getByRole('button', { name: '重试称号' }).click();
      await member.getByRole('button', { name: '重试会员信息' }).click();
      await expect(titles).toContainText('当前：摸鱼监督员');
      await expect(member).toContainText(mode === 'light' ? '永久有效' : '月度会员');
      await expect(dialog.getByRole('region', { name: '破蛋日', exact: true })).toContainText(
        '2025年01月02日',
      );
      await dialog.getByRole('textbox', { name: '用户名', exact: true }).fill('新岛友');
      await dialog.getByRole('textbox', { name: '个人简介' }).fill('在岛上记录日常');
      const titleSelect = titles.getByRole('combobox', { name: '称号设置' });
      await titleSelect.click();
      const list = page.getByRole('listbox', { name: '称号设置' });
      await expect(list).toBeVisible();
      const listBounds = (await list.boundingBox())!;
      expect(listBounds.x).toBeGreaterThanOrEqual(0);
      expect(listBounds.y).toBeGreaterThanOrEqual(0);
      expect(listBounds.x + listBounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(listBounds.y + listBounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      await page.screenshot({ path: info.outputPath('title-options.png') });
      await page.keyboard.press('Escape');
      await expect(list).toHaveCount(0);
      await expect(titleSelect).toBeFocused();
      await expect(dialog).toBeVisible();
      await titleSelect.press('ArrowDown');
      await expect(list).toBeVisible();
      if (page.viewportSize()!.width <= 760)
        await list.getByRole('option', { name: '摸鱼达人', exact: true }).click();
      else {
        await page.keyboard.press('End');
        await expect(list.getByRole('option', { name: '摸鱼达人', exact: true })).toBeFocused();
        await page.keyboard.press('Enter');
      }
      await expect(list).toHaveCount(0);
      await expect(titles).toContainText('当前：摸鱼达人');
      await expect(dialog.getByRole('textbox', { name: '用户名', exact: true })).toHaveValue(
        '新岛友',
      );
      await dialog.getByRole('button', { name: '默认头像 2', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '默认头像 2', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(dialog.getByRole('textbox', { name: '头像', exact: true })).toHaveValue(
        defaultAvatars[1],
      );
      const email = dialog.getByRole('region', { name: '邮箱绑定', exact: true });
      await email
        .getByRole('textbox', { name: '绑定邮箱', exact: true })
        .fill('synthetic@example.com');
      state.failEmail = true;
      await email.getByRole('button', { name: '获取验证码', exact: true }).click();
      await expect(email.getByRole('alert')).toContainText('合成验证码发送失败');
      state.failEmail = false;
      await email.getByRole('button', { name: '获取验证码', exact: true }).click();
      await expect(email.getByRole('button', { name: /秒后重发/ })).toBeDisabled();
      await email.getByRole('textbox', { name: '邮箱验证码' }).fill('000000');
      await email.getByRole('button', { name: '绑定邮箱', exact: true }).click();
      await expect(email.getByRole('alert')).toContainText('合成验证码错误');
      await email.getByRole('textbox', { name: '邮箱验证码' }).fill('654321');
      await email.getByRole('button', { name: '绑定邮箱', exact: true }).click();
      await expect(dialog).toContainText('synthetic@example.com');
      await expect(email).toHaveCount(0);
      await expect(dialog.getByRole('textbox', { name: '个人简介' })).toHaveValue('在岛上记录日常');
      await dialog.getByLabel('上传头像', { exact: true }).setInputFiles({
        name: 'avatar.png',
        mimeType: 'image/png',
        buffer: Buffer.from('synthetic-image'),
      });
      await expect(dialog.getByRole('textbox', { name: '头像', exact: true })).toHaveValue(
        'https://profile.test/avatar.svg',
      );
      await dialog
        .getByRole('textbox', { name: '朋友圈背景', exact: true })
        .fill('https://profile.test/cover.svg');
      await checkProfileScrollLayout(page);
      await checkProfileButtons(page);
      const editorScroll = page.getByRole('region', { name: '个人资料编辑区', exact: true });
      expect(
        await editorScroll.evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true);
      await editorScroll.evaluate((element) => {
        element.scrollTop = 0;
      });
      const originalViewport = page.viewportSize()!;
      if (originalViewport.width > 760) await page.setViewportSize({ width: 1280, height: 1000 });
      await page.screenshot({ path: info.outputPath('profile-ready.png') });
      if (originalViewport.width > 760) await page.setViewportSize(originalViewport);
      state.fail = true;
      await dialog.getByRole('button', { name: '保存修改', exact: true }).click();
      await expect(dialog.getByRole('alert')).toContainText('本月已修改');
      await checkProfileScrollGutter(page);
      const errorBounds = (await dialog.getByRole('alert').boundingBox())!;
      const saveBounds = (await dialog
        .getByRole('button', { name: '保存修改', exact: true })
        .boundingBox())!;
      expect(errorBounds.y + errorBounds.height).toBeLessThanOrEqual(saveBounds.y);
      expect(saveBounds.y + saveBounds.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      await page.screenshot({ path: info.outputPath('profile-error.png') });
      state.fail = false;
      state.saving = true;
      await dialog.getByRole('button', { name: '保存修改', exact: true }).click();
      await expect(dialog.getByRole('button', { name: '保存中…', exact: true })).toBeDisabled();
      expect(
        await dialog
          .getByRole('button', { name: '保存中…', exact: true })
          .evaluate((element) => getComputedStyle(element).opacity),
      ).toBe('0.5');
      await expect.poll(() => Boolean(state.releaseSave)).toBe(true);
      state.releaseSave!();
      await expect(dialog.getByRole('status')).toHaveText('个人信息已保存');
      expect(state.hotRequests).toBe(before);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('profile-success.png') });
      await dialog.getByRole('button', { name: '关闭个人资料' }).click();
      await expect(account).toBeFocused();
      await expect(account.locator('img')).toHaveAttribute('src', state.user.userAvatar);
      if (skin.id !== 'wps') {
        await expect(page.getByRole('textbox', { name: '消息输入框' })).toHaveValue(
          '编辑资料保留草稿',
        );
        await expect(page.getByLabel('演示消息', { exact: true }).locator('img')).toHaveAttribute(
          'src',
          state.user.userAvatar,
        );
      }
      await account.click();
      state.emptyExtras = true;
      await page.getByRole('button', { name: '修改信息', exact: true }).click();
      await expect(page.getByRole('textbox', { name: '朋友圈背景', exact: true })).toHaveValue(
        state.user.momentsBgUrl,
      );
      await expect(page.getByRole('combobox', { name: '称号设置' })).toHaveText('当前称号不可用');
      await expect(page.getByRole('region', { name: '称号设置', exact: true })).toContainText(
        '暂无其他可用称号',
      );
      await expect(page.getByRole('region', { name: '会员信息', exact: true })).toContainText(
        '暂无会员信息',
      );
      await checkProfileScrollGutter(page);
      await page.screenshot({ path: info.outputPath('profile-empty.png') });
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    });
  }
