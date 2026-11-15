import { expect, test } from '@playwright/test';
import { builtinSkins } from '../../src/skins/builtin';
import { setupPet } from './pet-fixture';
import { assertPetLayout } from './pet-layout';

test.setTimeout(180_000);
test.use({ hasTouch: true });

for (const skin of builtinSkins)
  for (const mode of ['light', 'dark'])
    for (const width of [1440, 375, 390]) {
      test(`${skin.id} ${mode} ${width}: animated boss and accessible fallback`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: width > 760 ? 1000 : 844 });
        const state = await setupPet(page, skin.id, mode);
        await expect(page.getByRole('heading', { name: /小苔/ })).toBeVisible();
        state.holdChallenges = true;
        await page.getByRole('button', { name: '宠物 Boss', exact: true }).tap();
        const dialog = page.getByRole('dialog', { name: '挑战', exact: true });
        await expect(dialog.getByRole('status')).toContainText('正在整理营地资料');
        await expect.poll(() => state.requests.includes('boss/list/cache')).toBe(true);
        state.holdChallenges = false;
        state.releaseChallenges();
        const boss = dialog.locator('picture img');
        await expect(boss).toHaveAttribute('src', '/assets/pet/villain-idle.webp');
        await expect
          .poll(() => boss.evaluate((image: HTMLImageElement) => image.naturalWidth))
          .toBe(256);
        await expect(boss).toBeVisible();
        await assertPetLayout(page);
        await page.screenshot({ path: info.outputPath('boss.png') });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect
          .poll(() => boss.evaluate((image: HTMLImageElement) => image.currentSrc))
          .toContain('villain-idle-still.webp');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await dialog.getByRole('button', { name: '开始挑战', exact: true }).tap();
        await expect(boss).toHaveAttribute('src', '/assets/pet/villain-idle.webp');
        await expect(boss).toBeVisible();
        await assertPetLayout(page);
        await dialog.getByRole('button', { name: '关闭面板', exact: true }).click();
        state.panelEmpty = true;
        await page.getByRole('button', { name: '宠物 Boss', exact: true }).click();
        await expect(dialog.getByRole('heading', { name: '首领暂未出现' })).toBeVisible();
        await assertPetLayout(page);
        state.panelEmpty = false;
        state.panelFail = true;
        await dialog.getByRole('button', { name: '刷新首领', exact: true }).click();
        await expect(dialog.getByRole('alert')).toBeVisible();
        await assertPetLayout(page);
        state.panelFail = false;
        await page.route('**/assets/pet/villain-idle.webp?image-failure', (route) => route.abort());
        await dialog.getByRole('button', { name: '重试', exact: true }).click();
        await expect(boss).toBeVisible();
        await boss.evaluate((image: HTMLImageElement) => {
          image.src = '/assets/pet/villain-idle.webp?image-failure';
        });
        await expect(dialog.getByText('图片暂不可用', { exact: true })).toBeVisible();
        await assertPetLayout(page);
        await dialog.getByRole('button', { name: '关闭面板', exact: true }).click();
        expect(state.battleCount).toBe(0);
      });
    }
