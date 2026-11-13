import { expect, test } from '@playwright/test';
import { setupChatMenu } from './chat-menu-fixture';

test('record titles handle ties, equal amounts and single recipients', async ({ page }) => {
  const fixture = await setupChatMenu(page, 'wechat', 'light');
  let amounts = [8, 8, 1, 1];
  await page.route('**/api/redpacket/detail?**', (route) =>
    route.fulfill({
      json: { code: 0, data: { name: '合成红包', type: 1, status: 1, remainingCount: 0 } },
    }),
  );
  await page.route('**/api/redpacket/records?**', (route) =>
    route.fulfill({
      json: {
        code: 0,
        data: amounts.map((amount, index) => ({
          id: `tie-${index}`,
          amount,
          userName: '长昵称'.repeat(20),
        })),
      },
    }),
  );
  fixture.push('1', '[redpacket]rpc_ties[/redpacket]');
  const trigger = page.getByRole('button', { name: '查看记录', exact: true });
  const dialog = page.getByRole('dialog', { name: '红包记录' });
  for (const scenario of [
    { amounts: [8, 8, 1, 1], count: 2 },
    { amounts: [4, 4], count: 0 },
    { amounts: [4], count: 0 },
  ]) {
    amounts = scenario.amounts;
    await trigger.click();
    await expect(dialog.getByRole('listitem')).toHaveCount(amounts.length);
    await expect(dialog.getByText('手气王', { exact: true })).toHaveCount(scenario.count);
    await expect(dialog.getByText('倒霉王', { exact: true })).toHaveCount(scenario.count);
    expect(
      await dialog
        .getByRole('region', { name: '红包领取记录' })
        .evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  }
});
