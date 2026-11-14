import { expect, type Locator } from '@playwright/test';

export async function finishPetBattle(dialog: Locator) {
  const skip = dialog.getByRole('button', { name: '跳过演出', exact: true });
  try {
    await skip.click({ timeout: 1500 });
  } catch {
    // A short server replay can naturally finish while the browser scrolls.
    await expect(dialog.getByRole('button', { name: '重播战斗', exact: true })).toBeVisible();
  }
  await expect(dialog.getByRole('button', { name: '重播战斗', exact: true })).toBeVisible();
}
