import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`registration ${skin.id} ${mode}`, async ({ page }, testInfo) => {
      await page.addInitScript(
        ({ skin, mode }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { skin: skin.id, mode },
      );
      let sends = 0;
      let registrations = 0;
      let reject = true;
      let finishSend!: () => void;
      let finishRegister!: () => void;
      const sendGate = new Promise<void>((resolve) => {
        finishSend = resolve;
      });
      const registerGate = new Promise<void>((resolve) => {
        finishRegister = resolve;
      });
      await page.route('**/api/hot/list', (route) =>
        route.fulfill({ json: { code: 0, data: [] } }),
      );
      await page.route('**/api/user/email/send', async (route) => {
        sends++;
        expect(route.request().postDataJSON()).toEqual({ email: 'synthetic@example.com' });
        await sendGate;
        await route.fulfill({ json: { code: 0, data: true } });
      });
      await page.route('**/api/user/email/register', async (route) => {
        registrations++;
        expect(route.request().postDataJSON()).toEqual({
          userAccount: '',
          ...(registrations === 1 ? { userName: '岛上的鱼' } : {}),
          email: 'synthetic@example.com',
          userPassword: 'synthetic-password',
          checkPassword: 'synthetic-password',
          code: '123456',
        });
        if (registrations === 1) await registerGate;
        await route.fulfill({
          json: reject ? { code: 40000, message: '验证码错误，请重试' } : { code: 0, data: '123' },
        });
      });
      await page.goto('/user/login');
      const dialog = page.getByRole('dialog', { name: '摸鱼岛', exact: true });
      await dialog.getByRole('button', { name: '切换到注册', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      const form = dialog.locator('form').filter({ has: page.locator('#register-email') });
      const name = form.getByLabel('昵称（选填）', { exact: true });
      const randomize = form.getByRole('button', { name: '随机生成' });
      const mobile = page.viewportSize()!.width <= 760;
      await expect(form.getByLabel('账号（选填）')).toHaveValue('');
      await expect(name).toHaveValue(/^岛民\d{4}$/);
      const initialName = await name.inputValue();
      expect((await randomize.boundingBox())!.height).toBe(mobile ? 44 : 32);
      if (mobile) {
        await randomize.tap();
      } else {
        await randomize.hover();
        await name.focus();
        await page.keyboard.press('Tab');
        await expect(randomize).toBeFocused();
        await page.keyboard.press('Enter');
      }
      await expect(name).toHaveValue(/^岛民\d{4}$/);
      await expect(name).not.toHaveValue(initialName);
      await form.getByRole('button', { name: '注册', exact: true }).click();
      expect(registrations).toBe(0);
      await name.fill('  岛上的鱼  ');
      await form.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await form.getByLabel('确认密码', { exact: true }).fill('different-password');
      await form.getByLabel('邮箱', { exact: true }).fill('synthetic@example.com');
      await form.getByRole('button', { name: '获取验证码' }).click();
      await expect(form.getByRole('status')).toContainText('正在发送');
      finishSend();
      await expect(form.getByRole('status')).toContainText('验证码已发送');
      expect(sends).toBe(1);
      await form.getByLabel('邮箱验证码', { exact: true }).fill('123456');
      await form.getByRole('button', { name: '注册', exact: true }).click();
      await expect(form.getByRole('alert')).toHaveText('两次输入的密码不一致');
      expect(registrations).toBe(0);
      await form.getByLabel('确认密码', { exact: true }).fill('synthetic-password');
      await form.getByRole('button', { name: '注册', exact: true }).click();
      await expect(form.getByRole('status').filter({ hasText: '正在注册' })).toBeVisible();
      await expect(name).toBeDisabled();
      await expect(randomize).toBeDisabled();
      finishRegister();
      await expect(form.getByRole('alert')).toHaveText('验证码错误，请重试');
      await expect(name).toHaveValue('  岛上的鱼  ');
      const region = dialog.getByRole('region', { name: '注册表单' });
      const scrollbar = dialog.locator('[data-orientation="vertical"]');
      await region.focus();
      await region.evaluate((element) => {
        element.scrollTop = 0;
      });
      await expect(form.getByLabel('账号（选填）')).toBeInViewport();
      const gap = await region.evaluate((element) => {
        const field = element.querySelector('#register-account')!.parentElement!;
        return element.getBoundingClientRect().right - field.getBoundingClientRect().right;
      });
      expect(gap).toBeGreaterThanOrEqual(page.viewportSize()!.width <= 760 ? 20 : 24);
      if (mobile) {
        await expect(scrollbar).toBeHidden();
      } else {
        await expect(scrollbar).toHaveCSS('opacity', '1');
      }
      await page.screenshot({ path: testInfo.outputPath('registration-top.png') });
      if (mobile) {
        const box = await region.boundingBox();
        const touch = await page.context().newCDPSession(page);
        const x = box!.x + box!.width / 2;
        const y = box!.y + box!.height - 12;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x, y: box!.y + 12 }],
        });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
        await touch.detach();
      }
      const code = form.getByLabel('邮箱验证码', { exact: true });
      await code.focus();
      await expect(code).toBeInViewport({ ratio: 1 });
      await form.getByRole('button', { name: '注册', exact: true }).focus();
      await expect(form.getByRole('button', { name: '注册', exact: true })).toBeInViewport();
      expect(await region.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath('registration.png') });
      reject = false;
      await name.fill('');
      await form.getByRole('button', { name: '注册', exact: true }).click();
      await expect(dialog.getByText('注册成功，请使用邮箱和密码登录。')).toBeVisible();
      await expect(dialog.getByLabel('账号或邮箱', { exact: true })).toHaveValue(
        'synthetic@example.com',
      );
      await expect(dialog.getByLabel('密码', { exact: true })).toHaveValue('');
      expect(registrations).toBe(2);
      expect(
        await page.evaluate(() =>
          Object.keys(localStorage).filter((key) => key.startsWith('fish-island-next.session:')),
        ),
      ).toEqual([]);
      await dialog.getByRole('button', { name: '关闭登录弹窗' }).click();
      await expect(dialog).toHaveCount(0);
    });
  }

test('registration code network failure can retry and closing cancels the pending request', async ({
  page,
}) => {
  await page.route('**/api/hot/list', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  let sends = 0;
  await page.route('**/api/user/email/send', async (route) => {
    sends++;
    if (sends === 1) await route.abort('failed');
  });
  await page.goto('/user/login');
  const dialog = page.getByRole('dialog', { name: '摸鱼岛', exact: true });
  await dialog.getByRole('button', { name: '切换到注册' }).click();
  await dialog.getByLabel('邮箱', { exact: true }).fill('synthetic@example.com');
  await dialog.getByRole('button', { name: '获取验证码' }).click();
  await expect(dialog.getByRole('alert')).toContainText('连接登录服务失败');
  await dialog.getByRole('button', { name: '获取验证码' }).click();
  await expect(dialog.getByRole('status')).toContainText('正在发送');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(sends).toBe(2);
});
