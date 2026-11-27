import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupChatMenu } from './chat-menu-fixture';
import { noOverflow, post, setup } from './fish-circle-fixture';

for (const skin of builtinSkins) {
  for (const mode of ['light', 'dark'] as const) {
    test(`${skin.id} ${mode}: dynamic reward presets, custom amount and retry`, async ({
      page,
      hasTouch,
    }, info) => {
      await page.addInitScript(
        ({ id, mode }) => {
          localStorage.setItem('fish-island:skin', id);
          localStorage.setItem('fish-island:color-mode', mode);
        },
        { id: skin.id, mode },
      );
      const state = await setup(page, true);
      const viewport = page.viewportSize()!;
      const mobile = viewport.width <= 760;
      const more = page.getByRole('button', { name: '更多动态操作' });
      const dialog = page.getByRole('dialog', { name: '打赏动态' });
      const close = dialog.getByRole('button', { name: '关闭操作' });
      const body = dialog.getByRole('region', { name: '打赏设置' });
      const presets = body.getByRole('group', { name: '常用积分' });
      const input = body.getByRole('spinbutton', { name: '打赏积分' });
      const confirm = dialog.getByRole('button', { name: '确认打赏', exact: true });
      const requests: number[] = [];
      page.on('request', (request) => {
        if (new URL(request.url()).pathname === '/api/moments/reward') {
          requests.push(request.postDataJSON().points as number);
        }
      });

      const openReward = async () => {
        await more.click();
        await page.getByRole('menuitem', { name: '打赏', exact: true }).click();
      };
      await openReward();
      await expect(page.locator('html')).toHaveAttribute('data-skin', skin.id);
      await expect(page.locator('html')).toHaveAttribute('data-color-mode', mode);
      await expect(input).toHaveValue('10');
      await expect(presets.getByRole('button', { pressed: true })).toHaveText('10 积分');
      await expect(presets.getByRole('button')).toHaveText([
        '5 积分',
        '10 积分',
        '15 积分',
        '20 积分',
      ]);
      await expect(confirm).toHaveCSS('min-height', mobile ? '44px' : '32px');
      await expect(presets).toHaveCSS(
        'grid-template-columns',
        mobile ? /^\S+ \S+$/ : /^\S+ \S+ \S+ \S+$/,
      );
      await expect(body).toHaveCSS('padding-inline-end', mobile ? '20px' : '24px');
      await noOverflow(page);
      expect(await body.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      const viewportBox = (await body.boundingBox())!;
      const inputBox = (await input.boundingBox())!;
      expect(
        viewportBox.x + viewportBox.width - inputBox.x - inputBox.width,
      ).toBeGreaterThanOrEqual(mobile ? 20 : 24);

      if (skin.id === 'moyu-island' || skin.id === 'pixel-island') {
        await dialog.screenshot({ path: info.outputPath('reward.png') });
      }

      if (hasTouch) {
        await presets.getByRole('button', { name: '15 积分' }).tap();
      } else {
        const ten = presets.getByRole('button', { name: '10 积分' });
        await ten.focus();
        await page.keyboard.press('Tab');
        const fifteen = presets.getByRole('button', { name: '15 积分' });
        await expect(fifteen).toBeFocused();
        await expect(fifteen).toHaveCSS('outline-style', 'solid');
        await page.keyboard.press('Space');
      }
      await expect(input).toHaveValue('15');
      await expect(presets.getByRole('button', { pressed: true })).toHaveText('15 积分');
      expect(requests).toEqual([]);
      state.delay = 600;
      state.mutationFailure = true;
      await confirm.click();
      await expect(dialog.getByRole('status')).toHaveText('处理中…');
      await expect(input).toBeDisabled();
      await expect(presets.getByRole('button', { pressed: true })).toBeDisabled();
      await expect(dialog.getByRole('alert')).toHaveText('合成操作失败');
      await expect(input).toHaveValue('15');
      expect(requests).toEqual([15]);

      await input.clear();
      await expect(confirm).toBeDisabled();
      await expect(presets.getByRole('button', { pressed: true })).toHaveCount(0);
      await input.fill('21');
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(dialog.getByRole('alert')).toHaveText('请输入 1 到 20 之间的整数。');
      await expect(confirm).toBeDisabled();
      await input.fill('7');
      await expect(confirm).toBeEnabled();
      state.delay = 0;
      state.mutationFailure = false;
      await confirm.click();
      await expect(dialog.getByRole('status')).toHaveText('操作成功');
      await expect(input).toBeDisabled();
      expect(requests).toEqual([15, 7]);
      await dialog.getByRole('button', { name: '完成' }).click();
      await expect(more).toBeFocused();

      await openReward();
      await expect(input).toHaveValue('10');
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
      await expect(more).toBeFocused();
      await openReward();
      if (hasTouch) await close.tap();
      else await close.click();
      await expect(dialog).toHaveCount(0);
      await expect(more).toBeFocused();
      expect(requests).toEqual([15, 7]);

      await openReward();
      await page.setViewportSize({ width: viewport.width, height: mobile ? 270 : 210 });
      const scrollbar = dialog.locator('[data-orientation="vertical"][data-state="visible"]');
      await expect.poll(() => body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      await expect(close).toBeInViewport();
      await expect(confirm).toBeInViewport();
      const firstPreset = presets.getByRole('button', { name: '5 积分', exact: true });
      await firstPreset.focus();
      await expect(firstPreset).toBeInViewport();
      if (mobile && hasTouch) {
        await expect(scrollbar).toHaveCSS('visibility', 'hidden');
        const { x, y, width, height } = (await body.boundingBox())!;
        const touch = await page.context().newCDPSession(page);
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: x + width - 14, y: y + height - 8 }],
        });
        await touch.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: x + width - 14, y: y + 8 }],
        });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
      } else {
        await body.focus();
        await expect(scrollbar).toBeVisible();
        await expect(scrollbar).toHaveCSS('opacity', '1');
        await page.keyboard.press('End');
      }
      await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
      await input.focus();
      await expect(input).toBeInViewport();
    });
  }
}

for (const skin of ['moyu-island', 'pixel-island']) {
  for (const mode of ['light', 'dark']) {
    test(`${skin} ${mode}: reward from the desktop chat sidebar`, async ({ page }) => {
      test.skip(page.viewportSize()!.width <= 760, '聊天侧栏入口仅在桌面显示');
      let listRequests = 0;
      await setupChatMenu(page, skin, mode, 'user', async () => {
        await page.route('**/api/moments/list', (route) => {
          listRequests++;
          return route.fulfill({
            json: { code: 0, data: { records: [{ ...post, userId: '456' }], total: 1 } },
          });
        });
      });
      const draft = page.getByRole('textbox', { name: '消息草稿' });
      await draft.fill('合成聊天草稿');
      const more = page
        .getByRole('region', { name: '海岛鱼小圈' })
        .getByRole('button', { name: '更多动态操作' });
      await expect(more).toBeVisible();
      const beforeReward = listRequests;
      await more.click();
      await page.getByRole('menuitem', { name: '打赏', exact: true }).click();
      const reward = page.getByRole('dialog', { name: '打赏动态' });
      await reward.getByRole('button', { name: '20 积分', exact: true }).click();
      await expect(reward.getByRole('spinbutton', { name: '打赏积分' })).toHaveValue('20');
      await page.keyboard.press('Escape');
      await expect(reward).toHaveCount(0);
      await expect(more).toBeFocused();
      await expect(draft).toHaveText('合成聊天草稿');
      expect(listRequests).toBe(beforeReward);
    });
  }
}
