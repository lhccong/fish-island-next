import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { scrollRegion } from './account-menu-layout';

const code = 'K7M4X9';
const sessionKey = 'fish-island-next.session:https%3A%2F%2Fapi.yucoder.cn';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`invitation ${skin.id} ${mode}`, async ({ page }, info) => {
      const size = page.viewportSize()!;
      const mobile = size.width < 760;
      const press = (locator: Locator) => (mobile ? locator.tap() : locator.click());
      await page.addInitScript(
        ({ skin, mode, sessionKey }) => {
          localStorage.setItem('fish-island:skin', skin);
          localStorage.setItem('fish-island:color-mode', mode);
          if (location.pathname === '/')
            sessionStorage.setItem(
              sessionKey,
              JSON.stringify({ tokenName: 'synthetic-session', tokenValue: 'synthetic' }),
            );
          Object.defineProperty(navigator, 'clipboard', {
            value: {
              async writeText(value: string) {
                if (sessionStorage.getItem('test:deny-clipboard'))
                  throw new DOMException('Denied', 'NotAllowedError');
                sessionStorage.setItem('test:clipboard', value);
              },
            },
          });
          Object.defineProperty(navigator, 'canShare', { value: () => true });
          Object.defineProperty(navigator, 'share', {
            value: async ({ url }: ShareData) => sessionStorage.setItem('test:share', url ?? ''),
          });
        },
        { skin: skin.id, mode, sessionKey },
      );
      await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
      await page.route('**/api/user/get/login', (route) =>
        route.fulfill({
          json: { code: 0, data: { id: 'synthetic-user', userName: '合成岛民', userRole: 'user' } },
        }),
      );
      let generations = 0;
      let finish!: () => void;
      const gate = new Promise<void>((resolve) => {
        finish = resolve;
      });
      await page.route('**/api/user/invitation', async (route) => {
        expect(route.request().method()).toBe('POST');
        expect(route.request().headers()['synthetic-session']).toBe('synthetic');
        if (++generations === 1) {
          await gate;
          return route.fulfill({ json: { code: 50000, message: '生成失败，请重试' } });
        }
        await route.fulfill({ json: { code: 0, data: code } });
      });
      let registrations = 0;
      await page.route('**/api/user/email/register', (route) => {
        expect(route.request().postDataJSON()).toMatchObject({ inviteCode: code });
        return route.fulfill({
          json:
            ++registrations === 1
              ? { code: 40000, message: '邀请码无效，请检查或清空后继续注册' }
              : { code: 0, data: '123' },
        });
      });

      await page.goto('/');
      const account = page.getByRole('button', { name: '用户菜单', exact: true });
      const open = async () => {
        await press(account);
        await press(page.getByRole('menuitem', { name: '邀请好友' }));
      };
      const dialog = page.getByRole('dialog', { name: '邀请好友加入摸鱼岛' });
      await open();
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await expect(dialog.getByRole('status')).toHaveText('正在准备邀请…');
      await expect.poll(() => generations).toBe(1);
      await press(dialog.getByRole('button', { name: '关闭', exact: true }));
      await expect(dialog).toHaveCount(0);
      await open();
      await expect(dialog.getByRole('status')).toHaveText('正在准备邀请…');
      expect(generations).toBe(1);
      finish();
      await expect(dialog.getByRole('alert')).toHaveText('生成失败，请重试');
      const retry = dialog.getByRole('button', { name: '重试' });
      expect((await retry.boundingBox())!.height).toBe(mobile ? 44 : 32);
      if (mobile) await press(retry);
      else {
        await retry.hover();
        await retry.focus();
        await page.keyboard.press('Enter');
      }

      const url = new URL(`/user/login?invite=${code}`, page.url()).href;
      const link = dialog.getByRole('textbox', { name: '邀请链接' });
      await expect(link).toHaveValue(url);
      const panel = dialog.getByRole('group', { name: '邀请码和二维码' });
      const codeInput = panel.getByRole('textbox', { name: '邀请码' });
      const copyCode = panel.getByRole('button', { name: '复制邀请码' });
      await expect(codeInput).toHaveValue(code);
      const qr = panel.getByRole('img', { name: '邀请二维码' });
      await expect(qr).toBeVisible();
      await expect(panel).toBeInViewport({ ratio: 1 });
      const [codeBounds, copyBounds, qrBounds] = await Promise.all([
        codeInput.boundingBox(),
        copyCode.boundingBox(),
        qr.boundingBox(),
      ]);
      expect(copyBounds!.height).toBe(mobile ? 44 : 32);
      expect(qrBounds!.x).toBeGreaterThan(codeBounds!.x + codeBounds!.width);
      if (mobile) expect(copyBounds!.y).toBeGreaterThan(codeBounds!.y + codeBounds!.height);
      await press(dialog.getByRole('button', { name: '复制链接' }));
      await expect(dialog.getByRole('status')).toHaveText('邀请链接已复制');
      expect(await page.evaluate(() => sessionStorage.getItem('test:clipboard'))).toBe(url);
      await press(dialog.getByRole('button', { name: '复制邀请码' }));
      await expect(dialog.getByRole('status')).toHaveText('邀请码已复制');
      expect(await page.evaluate(() => sessionStorage.getItem('test:clipboard'))).toBe(code);
      await page.evaluate(() => sessionStorage.setItem('test:deny-clipboard', 'true'));
      await press(dialog.getByRole('button', { name: '复制邀请码' }));
      await expect(dialog.getByRole('alert')).toHaveText('无法自动复制，请手动复制邀请码');
      await expect(dialog.getByRole('textbox', { name: '邀请码' })).toBeFocused();
      await press(dialog.getByRole('button', { name: '用系统分享' }));
      expect(await page.evaluate(() => sessionStorage.getItem('test:share'))).toBe(url);
      if (process.env.INVITATION_CAPTURE) {
        await page.screenshot({ path: info.outputPath('invitation.png') });
        await qr
          .evaluate((element) => (element as HTMLCanvasElement).toDataURL())
          .then((image) =>
            info.attach('qr', {
              body: Buffer.from(image.split(',')[1]!, 'base64'),
              contentType: 'image/png',
            }),
          );
      }

      await page.setViewportSize({ width: size.width, height: 355 });
      const region = dialog.getByRole('region', { name: '邀请内容' });
      const scrollbar = dialog.locator('[data-orientation="vertical"]');
      await region.focus();
      await expect(dialog.getByRole('button', { name: '关闭邀请弹窗' })).toBeInViewport();
      if (mobile) await expect(scrollbar).toBeHidden();
      else await expect(scrollbar).toHaveCSS('opacity', '1');
      const layout = await region.evaluate((element) => {
        const label = element.querySelector('label')!.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        return {
          gutter: Number.parseFloat(getComputedStyle(element).paddingInlineEnd),
          overflow: element.scrollWidth > element.clientWidth,
          start: label.left - bounds.left,
          end: bounds.right - label.right,
          top: label.top - bounds.top,
        };
      });
      expect(layout).toMatchObject({ gutter: mobile ? 20 : 24, overflow: false });
      expect(layout.end).toBeGreaterThanOrEqual(layout.gutter);
      expect(layout.start).toBeGreaterThanOrEqual(4);
      expect(layout.top).toBeGreaterThanOrEqual(4);
      await scrollRegion(page, region, mobile);
      await expect.poll(() => region.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
      await expect(qr).toBeInViewport();
      await link.focus();
      await expect(link).toBeInViewport({ ratio: 1 });
      await page.setViewportSize(size);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(account).toBeFocused();
      await open();
      await expect(link).toHaveValue(url);
      await press(dialog.getByRole('button', { name: '关闭邀请弹窗' }));
      await expect(account).toBeFocused();
      expect(generations).toBe(2);

      await page.evaluate((key) => sessionStorage.removeItem(key), sessionKey);
      await page.goto(url);
      const registration = page.getByRole('dialog', { name: '摸鱼岛', exact: true });
      const form = registration
        .locator('form')
        .filter({ has: page.locator('#register-invitation') });
      const invitation = form.getByLabel('邀请码（选填）');
      await expect(invitation).toHaveValue(code);
      if (process.env.INVITATION_CAPTURE)
        await page.screenshot({ path: info.outputPath('registration.png') });
      await form.getByLabel('密码', { exact: true }).fill('synthetic-password');
      await form.getByLabel('确认密码', { exact: true }).fill('synthetic-password');
      await form.getByLabel('邮箱', { exact: true }).fill('synthetic@example.test');
      await form.getByLabel('邮箱验证码').fill('123456');
      await invitation.fill('WRONG');
      const register = form.getByRole('button', { name: '注册', exact: true });
      await press(register);
      await expect(registration.getByRole('alert')).toHaveText(
        '请输入有效的邀请码，或清空后继续注册',
      );
      expect(registrations).toBe(0);
      await invitation.fill(code.toLowerCase());
      await press(register);
      await expect(registration.getByRole('alert')).toContainText('邀请码无效');
      await expect(invitation).toHaveValue(code.toLowerCase());
      await press(register);
      await expect(registration.getByText('注册成功，请使用邮箱和密码登录。')).toBeVisible();
      expect(registrations).toBe(2);
    });
  }

test('a previously shared sixteen-character invitation still registers', async ({ page }) => {
  const legacy = '89ABCDEF01234567';
  await page.route('**/api/**', (route) => route.fulfill({ json: { code: 0, data: [] } }));
  await page.route('**/api/user/email/register', (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ inviteCode: legacy });
    return route.fulfill({ json: { code: 0, data: '123' } });
  });
  await page.goto(`/user/login?invite=${legacy}`);
  const dialog = page.getByRole('dialog', { name: '摸鱼岛', exact: true });
  const form = dialog.locator('form').filter({ has: page.locator('#register-invitation') });
  await expect(form.getByLabel('邀请码（选填）')).toHaveValue(legacy);
  await form.getByLabel('密码', { exact: true }).fill('synthetic-password');
  await form.getByLabel('确认密码', { exact: true }).fill('synthetic-password');
  await form.getByLabel('邮箱', { exact: true }).fill('synthetic@example.test');
  await form.getByLabel('邮箱验证码').fill('123456');
  await form.getByRole('button', { name: '注册', exact: true }).click();
  await expect(dialog.getByText('注册成功，请使用邮箱和密码登录。')).toBeVisible();
});
