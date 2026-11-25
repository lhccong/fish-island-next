import { expect, test, type Locator } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { mockProfile } from './account-profile-fixture';
import { checkProfileScrollGutter } from './profile-scroll-layout';

const personalityTest = 'https://www.16personalities.com/ch/%E4%BA%BA%E6%A0%BC%E6%B5%8B%E8%AF%95';

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark']) {
    test(`${skin.id} ${mode}: select, save, reload and clear MBTI`, async ({ page }, info) => {
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

      const mobile = page.viewportSize()!.width <= 760;
      const activate = (target: Locator) => (mobile ? target.tap() : target.click());
      const account = page.getByRole('button', { name: '用户菜单', exact: true });
      const dialog = page.getByRole('dialog');
      const edit = dialog.getByRole('button', { name: '修改信息', exact: true });
      const save = dialog.getByRole('button', { name: '保存修改', exact: true });
      const mbti = dialog.getByRole('combobox', { name: 'MBTI', exact: true });
      const testLink = dialog.getByRole('link', { name: '打开人格测试（新标签页）' });
      const value = dialog
        .locator('dl > div')
        .filter({ has: page.getByText('MBTI', { exact: true }) })
        .locator('dd');
      const list = page.getByRole('listbox', { name: 'MBTI', exact: true });
      const openProfile = async () => {
        await activate(account);
        await activate(page.getByRole('menuitem', { name: '个人资料与签到', exact: true }));
      };
      await openProfile();
      await expect(value).toHaveText('未填写');
      await activate(edit);
      const { viewport, railBox } = await checkProfileScrollGutter(page);
      await expect(mbti).toHaveText('未填写');
      await mbti.scrollIntoViewIfNeeded();
      const triggerBox = (await mbti.boundingBox())!;
      expect(triggerBox.height).toBeGreaterThanOrEqual(44);
      const linkBox = (await testLink.boundingBox())!;
      expect(linkBox.width).toBeGreaterThanOrEqual(44);
      expect(linkBox.height).toBeGreaterThanOrEqual(44);
      expect(linkBox.x - triggerBox.x - triggerBox.width).toBeGreaterThanOrEqual(8 - 0.5);
      expect(linkBox.x + linkBox.width + 4).toBeLessThanOrEqual(railBox.x);
      expect(linkBox.y).toBeCloseTo(triggerBox.y, 0);
      await expect(testLink).toHaveAttribute('href', personalityTest);
      expect(await viewport.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);

      await mbti.press('Enter');
      await expect(list.getByRole('option')).toHaveCount(17);
      await expect(list.getByRole('option', { name: '未填写' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await page.keyboard.press('Escape');
      await expect(list).toHaveCount(0);
      await expect(mbti).toBeFocused();
      await mbti.press('Enter');
      await expect(list.getByRole('option', { name: '未填写' })).toBeFocused();
      await page.keyboard.press('End');
      await expect(list.getByRole('option', { name: 'ENTJ' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(mbti).toHaveText('ENTJ');

      await page.context().route(personalityTest, (route) => route.fulfill({ body: '人格测试' }));
      if (!mobile) {
        const normal = await testLink.evaluate((el) => getComputedStyle(el).backgroundColor);
        await testLink.hover();
        await expect
          .poll(() => testLink.evaluate((el) => getComputedStyle(el).backgroundColor))
          .not.toBe(normal);
        await expect(mbti).toBeFocused();
        await page.keyboard.press('Tab');
        await expect(testLink).toBeFocused();
      }
      if (skin.id === 'pixel-island' && (mobile ? mode === 'dark' : mode === 'light')) {
        await page.screenshot({ path: info.outputPath('mbti-test-link.png') });
      }
      const opened = page.context().waitForEvent('page');
      if (mobile) await testLink.tap();
      else await page.keyboard.press('Enter');
      const testPage = await opened;
      await testPage.waitForURL(personalityTest);
      expect(await testPage.evaluate(() => window.opener === null)).toBe(true);
      await testPage.close();
      await expect(mbti).toHaveText('ENTJ');
      expect(state.updates).toBe(0);

      await activate(dialog.getByRole('button', { name: '取消', exact: true }));
      await expect(value).toHaveText('未填写');
      expect(state.updates).toBe(0);

      await activate(edit);
      if (mobile) {
        // Bring the field into the scroll viewport before tapping the trigger.
        await mbti.scrollIntoViewIfNeeded();
        await activate(mbti);
      } else {
        await mbti.hover();
        await activate(mbti);
      }
      const options = list.locator('[data-scroll-viewport]');
      const box = (await options.boundingBox())!;
      expect(box.x).toBeGreaterThan(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize()!.height);
      if (mobile) {
        const touch = await page.context().newCDPSession(page);
        const x = box.x + box.width / 2;
        const y = box.y + box.height - 20;
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        });
        for (let step = 1; step <= 6; step++) {
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x, y: y - (step * Math.min(120, box.height - 30)) / 6 }],
          });
        }
        await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await touch.detach();
      } else {
        await options.hover();
        await page.mouse.wheel(0, 120);
      }
      await expect.poll(() => options.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      expect(await options.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath('mbti-options.png') });
      await activate(list.getByRole('option', { name: 'INFP', exact: true }));
      await expect(mbti).toHaveText('INFP');

      state.fail = true;
      await activate(save);
      await expect(dialog.getByRole('alert')).toContainText('本月已修改');
      await expect(mbti).toHaveText('INFP');
      state.fail = false;
      state.saving = true;
      await activate(save);
      await expect(mbti).toBeDisabled();
      await expect(
        dialog.getByRole('button', { name: '保存中…' }).getByRole('status'),
      ).toBeVisible();
      await expect.poll(() => Boolean(state.releaseSave)).toBe(true);
      state.releaseSave!();
      await expect(value).toHaveText('INFP');
      await expect(dialog.getByRole('status')).toHaveText('个人信息已保存');

      await page.reload();
      await openProfile();
      await expect(value).toHaveText('INFP');
      await activate(edit);
      await activate(mbti);
      await activate(list.getByRole('option', { name: '未填写' }));
      state.saving = false;
      const clearing = page.waitForRequest('**/api/user/update/my');
      await activate(save);
      expect((await clearing).postDataJSON()).toMatchObject({ mbti: '' });
      await expect(value).toHaveText('未填写');
      await activate(dialog.getByRole('button', { name: '关闭个人资料' }));
      await expect(account).toBeFocused();
    });
  }
